import { Server as SocketIOServer } from "socket.io";
import type http from "node:http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { getModuleLogger } from "../config/logger.js";
import type { AuthUser } from "../shared/types/index.js";
import { isPublicId, parsePublicId } from "../shared/ids/index.js";

interface AccessTokenPayload {
  sub: string;
  email: string;
  userType: string;
  departmentId: number | null;
  mustChangePassword: boolean;
  exp: number;
}

let io: SocketIOServer | null = null;
const socketLogger = getModuleLogger("socket");

// ─── Connection Rate Limiting ────────────────────────────────────────────────

const connectionCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_CONNECTIONS_PER_MINUTE = 10;
const MAX_JOINED_CHANNEL_ROOMS = 32;
const MAX_CHANNEL_JOIN_ATTEMPTS_PER_MINUTE = 60;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Clear connection rate limit state (for testing).
 */
export function resetConnectionCounts(): void {
  connectionCounts.clear();
}

/**
 * Initialize Socket.IO on the given HTTP server.
 * Authenticates connections via the same JWT cookie used by REST endpoints.
 */
export function initializeSocket(server: http.Server): SocketIOServer {
  if (io) {
    io.removeAllListeners();
    io.close();
  }

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    path: "/api/socket.io",
  });

  // ─── Connection Rate Limiting Middleware ────────────────────────────────
  io.use((socket, next) => {
    if (env.NODE_ENV === "test") {
      return next();
    }

    const ip = socket.handshake.address;
    const now = Date.now();
    const entry = connectionCounts.get(ip);

    if (!entry || now > entry.resetAt) {
      connectionCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    } else if (entry.count >= MAX_CONNECTIONS_PER_MINUTE) {
      return next(new Error("Too many connections"));
    } else {
      entry.count++;
    }

    next();
  });

  // ─── Authentication Middleware ──────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error("Authentication required"));
      }

      // Parse access_token from cookie header
      const token = parseCookie(cookieHeader, "access_token");
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      const userId = Number(payload.sub);

      if (!Number.isInteger(userId) || userId <= 0) {
        return next(new Error("Authentication required"));
      }

      if (payload.mustChangePassword) {
        return next(new Error("Password change required"));
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          userType: true,
          departmentId: true,
          mustChangePassword: true,
          status: true,
          isDeleted: true,
        },
      });

      if (!user || user.isDeleted || user.status !== "ACTIVE") {
        return next(new Error("Authentication required"));
      }

      if (user.mustChangePassword) {
        return next(new Error("Password change required"));
      }

      // Attach user data to the socket
      socket.data.user = {
        id: user.id,
        email: user.email,
        userType: user.userType,
        departmentId: user.departmentId,
        mustChangePassword: user.mustChangePassword,
      } satisfies AuthUser;

      // Store token expiry for auto-disconnect
      socket.data.tokenExp = payload.exp;

      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });

  // ─── Connection Handler ────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const user = socket.data.user as AuthUser;
    const joinedChannelIds = new Map<string, number>();
    const pendingChannelPublicIds = new Set<string>();
    let joinAttemptWindow = { count: 0, resetAt: Date.now() + 60_000 };

    // Join user-specific room for targeted notification delivery
    socket.join(`user:${user.id}`);

    // Auto-disconnect when access token expires
    const tokenExp = socket.data.tokenExp as number;
    const msUntilExpiry = tokenExp * 1000 - Date.now();
    const disconnectTimer = setTimeout(() => {
      socket.disconnect(true);
    }, Math.max(msUntilExpiry, 0));

    socket.on("disconnect", () => {
      clearTimeout(disconnectTimer);
      joinedChannelIds.clear();
      pendingChannelPublicIds.clear();
    });

    socket.on("channel:join", async (rawEnvelope: unknown) => {
      const now = Date.now();
      if (now > joinAttemptWindow.resetAt) {
        joinAttemptWindow = { count: 0, resetAt: now + 60_000 };
      }
      joinAttemptWindow.count++;
      if (joinAttemptWindow.count > MAX_CHANNEL_JOIN_ATTEMPTS_PER_MINUTE) {
        return;
      }

      const channelPublicId = getChannelPublicId(rawEnvelope);
      if (
        !channelPublicId ||
        joinedChannelIds.has(channelPublicId) ||
        pendingChannelPublicIds.has(channelPublicId)
      ) {
        return;
      }
      if (joinedChannelIds.size + pendingChannelPublicIds.size >= MAX_JOINED_CHANNEL_ROOMS) {
        return;
      }

      pendingChannelPublicIds.add(channelPublicId);
      try {
        const channelId = await resolveJoinableChannelId(user, channelPublicId);
        if (!channelId) {
          return;
        }

        socket.join(`channel:${channelId}`);
        joinedChannelIds.set(channelPublicId, channelId);
      } catch (error) {
        socketLogger.warn({
          userId: user.id,
          channelPublicId,
          err: error,
        }, "Failed to join channel");
      } finally {
        pendingChannelPublicIds.delete(channelPublicId);
      }
    });

    socket.on("channel:leave", (rawEnvelope: unknown) => {
      const channelPublicId = getChannelPublicId(rawEnvelope);
      if (!channelPublicId) {
        return;
      }

      const channelId = joinedChannelIds.get(channelPublicId);
      if (!channelId) {
        return;
      }
      socket.leave(`channel:${channelId}`);
      joinedChannelIds.delete(channelPublicId);
    });
  });

  // Periodically prune expired rate-limit entries to prevent memory growth
  // Skip in test env — rate limiting is bypassed and the interval can prevent clean Jest exit
  if (env.NODE_ENV !== "test") {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of connectionCounts) {
        if (now > entry.resetAt) {
          connectionCounts.delete(ip);
        }
      }
    }, 60_000);

    cleanupInterval.unref();
  }

  return io;
}

/**
 * Get the Socket.IO server instance.
 * Returns null if Socket.IO has not been initialized (e.g., in tests).
 */
export function getIO(): SocketIOServer | null {
  return io;
}

export function emitToChannel(channelId: number, event: string, data: unknown): void {
  if (io) {
    io.to(`channel:${channelId}`).emit(event, data);
  }
}

export function emitToUser(userId: number, event: string, data: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function disconnectUserSockets(userId: number): void {
  if (!io) {
    return;
  }

  const room = `user:${userId}`;
  io.to(room).emit("auth:expired");
  io.in(room).disconnectSockets(true);
}

/**
 * Reset the Socket.IO instance (for testing).
 */
export function resetIO(): void {
  if (io) {
    io.removeAllListeners();
    io.close();
  }
  io = null;

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  connectionCounts.clear();
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

function parseCookie(cookieHeader: string, name: string): string | undefined {
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key.trim() === name) {
      const value = rest.join("=").trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return undefined;
}

function getChannelPublicId(envelope: unknown): string | undefined {
  if (
    typeof envelope !== "object" ||
    envelope === null ||
    !("channelPublicId" in envelope)
  ) {
    return undefined;
  }

  const value = envelope.channelPublicId;
  return isPublicId(value) ? parsePublicId(value) : undefined;
}

async function resolveJoinableChannelId(
  user: AuthUser,
  channelPublicId: string,
): Promise<number | undefined> {
  const channel = await prisma.channel.findUnique({
    where: { publicId: channelPublicId },
    select: {
      id: true,
      serverId: true,
      isDeleted: true,
      isArchived: true,
      server: {
        select: {
          isDeleted: true,
          society: {
            select: { status: true, isDeleted: true },
          },
        },
      },
    },
  });

  if (
    !channel ||
    channel.isDeleted ||
    channel.isArchived ||
    channel.server.isDeleted ||
    (channel.server.society &&
      (channel.server.society.status !== "ACTIVE" ||
        channel.server.society.isDeleted))
  ) {
    return undefined;
  }

  if (user.userType === "ADMIN") {
    return channel.id;
  }

  const membership = await prisma.serverMembership.findUnique({
    where: { userId_serverId: { userId: user.id, serverId: channel.serverId } },
  });

  return membership ? channel.id : undefined;
}
