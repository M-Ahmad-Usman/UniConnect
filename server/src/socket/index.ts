import { Server as SocketIOServer } from "socket.io";
import type http from "node:http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser } from "../shared/types/index.js";

interface AccessTokenPayload {
  id: number;
  email: string;
  userType: string;
  departmentId: number | null;
  mustChangePassword: boolean;
}

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO on the given HTTP server.
 * Authenticates connections via the same JWT cookie used by REST endpoints.
 */
export function initializeSocket(server: http.Server): SocketIOServer {
  if (io) {
    io.removeAllListeners();
    io.close();
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
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

    socket.on("disconnect", () => {
      // Cleanup handled by Socket.IO automatically
    });
  });

  return io;
}

/**
 * Get the Socket.IO server instance.
 * Returns null if Socket.IO has not been initialized (e.g., in tests).
 */
export function getIO(): SocketIOServer | null {
  return io;
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
