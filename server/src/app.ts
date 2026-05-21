import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { csrfProtection } from "./middleware/csrf.js";
import { NotFoundError } from "./shared/errors/index.js";
import { prisma } from "./config/prisma.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import departmentRoutes from "./modules/department/department.routes.js";
import degreeLevelRoutes from "./modules/degree-level/degree-level.routes.js";
import programRoutes from "./modules/program/program.routes.js";
import disciplineRoutes from "./modules/discipline/discipline.routes.js";
import classRoutes from "./modules/class/class.routes.js";
import courseRoutes from "./modules/course/course.routes.js";
import societyRoutes from "./modules/society/society.routes.js";
import roleRoutes from "./modules/role/role.routes.js";
import permissionRoutes from "./modules/permission/permission.routes.js";
import serverRoutes from "./modules/server/server.routes.js";
import channelRoutes from "./modules/channel/channel.routes.js";
import { channelPostRoutes, postRoutes } from "./modules/post/post.routes.js";
import {
  notificationRoutes,
  notificationPreferenceRoutes,
} from "./modules/notification/notification.routes.js";
import { registerNotificationListeners } from "./modules/notification/notification.listener.js";
import adminRoutes from "./modules/admin/admin.routes.js";

const app = express();

// ─── Reverse Proxy Trust ─────────────────────────────────────────────────────
// Required for PaaS (Render, Railway, etc.) so req.ip and rate limiters
// see the real client IP instead of the proxy's IP.
app.set("trust proxy", 1);

// ─── Security & Parsing Middleware ──────────────────────────────────────────
app.use(
  helmet({
    // API-only server: disable HTML-focused headers that add no value
    contentSecurityPolicy: false,
    // Enforce HTTPS via HSTS when behind PaaS TLS termination
    hsts: env.NODE_ENV === "production"
      ? { maxAge: 63072000, includeSubDomains: true, preload: true } // 2 years
      : false,
  })
);
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());
app.use("/api", csrfProtection);

// ─── Request Timeout ────────────────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 30_000;
app.use((_req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ success: false, message: "Request timeout" });
    }
  }, REQUEST_TIMEOUT_MS);
  res.on("close", () => clearTimeout(timer));
  next();
});

// ─── HTTP Request Logging ────────────────────────────────────────────────────
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ─── Health Check ───────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    res.json({ success: true, message: "OK", db: "ok" });
  } catch {
    res.status(503).json({ success: false, message: "Service unavailable", db: "down" });
  }
});

// ─── Rate Limiting ──────────────────────────────────────────────────────────
app.use("/api", generalLimiter);

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/degree-levels", degreeLevelRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/disciplines", disciplineRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/societies", societyRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/channels", channelPostRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/notification-preferences", notificationPreferenceRoutes);
app.use("/api/admin", adminRoutes);

// ─── Event Listeners ────────────────────────────────────────────────────────
registerNotificationListeners();

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new NotFoundError("Route not found"));
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

export { app };
