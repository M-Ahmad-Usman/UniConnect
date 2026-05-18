import { Server as SocketIOServer } from "socket.io";
import type http from "node:http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import type { AuthUser } from "../shared/types/index.js";

interface AccessTokenPayload {
  id: number;
  email: string;
  userType: string;
  departmentId: number | null;
  mustChangePassword: boolean;
  exp: number;
}

let io: SocketIOServer | null = null;

// ─── Connection Rate Limiting ────────────────────────────────────────────────

const connectionCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_CONNECTIONS_PER_MINUTE = 10;
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
  io.use((socket, next) => {
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

      if (payload.mustChangePassword) {
        return next(new Error("Password change required"));
      }

      // Attach user data to the socket
      socket.data.user = {
        id: payload.id,
        email: payload.email,
        userType: payload.userType,
        departmentId: payload.departmentId,
        mustChangePassword: payload.mustChangePassword,
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

    // Join user-specific room for targeted notification delivery
    socket.join(`user:${user.id}`);

    // Auto-disconnect when access token expires
    const tokenExp = socket.data.tokenExp as number;
    const msUntilExpiry = tokenExp * 1000 - Date.now();
    const disconnectTimer = setTimeout(() => {
      socket.emit("auth:expired");
      socket.disconnect(true);
    }, Math.max(msUntilExpiry, 0));

    socket.on("disconnect", () => {
      clearTimeout(disconnectTimer);
    });

    socket.on("channel:join", async (rawChannelId) => {
      const channelId = Number(rawChannelId);
      if (!Number.isInteger(channelId) || channelId <= 0) {
        return;
      }

      try {
        const allowed = await canJoinChannel(user, channelId);
        if (!allowed) {
          return;
        }

        socket.join(`channel:${channelId}`);
      } catch (error) {
        console.warn("[Socket] Failed to join channel", {
          userId: user.id,
          channelId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    socket.on("channel:leave", (rawChannelId) => {
      const channelId = Number(rawChannelId);
      if (!Number.isInteger(channelId) || channelId <= 0) {
        return;
      }

      socket.leave(`channel:${channelId}`);
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

async function canJoinChannel(user: AuthUser, channelId: number): Promise<boolean> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, serverId: true, isDeleted: true, isArchived: true },
  });

  if (!channel || channel.isDeleted || channel.isArchived) {
    return false;
  }

  if (user.userType === "ADMIN") {
    return true;
  }

  const membership = await prisma.serverMembership.findUnique({
    where: { userId_serverId: { userId: user.id, serverId: channel.serverId } },
  });

  return Boolean(membership);
}
