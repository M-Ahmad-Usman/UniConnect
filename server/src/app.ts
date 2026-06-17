import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import "./config/telemetry.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { csrfProtection } from "./middleware/csrf.js";
import { NotFoundError } from "./shared/errors/index.js";
import { requestId } from "./middleware/requestId.js";
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

const androidAssetLinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "dev.uniconnect.app",
      sha256_cert_fingerprints: [
        "77:50:D0:97:F9:39:A4:76:33:D5:A2:3C:C6:08:38:89:80:6F:33:A6:9F:BE:52:90:7B:73:D3:5B:8B:5A:0B:64",
      ],
    },
  },
];

// ─── Reverse Proxy Trust ─────────────────────────────────────────────────────
// Required for PaaS (Render, Railway, etc.) so req.ip and rate limiters
// see the real client IP instead of the proxy's IP.
app.set("trust proxy", 1);

// ─── Security & Parsing Middleware ──────────────────────────────────────────
app.use(requestId);
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

// Android App Links domain verification. This route is intentionally public and
// outside /api so package-manager verification is not blocked by API middleware.
app.get("/.well-known/assetlinks.json", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(androidAssetLinks);
});

app.use("/api", (req, res, next) => {
  // exclude authentication lifecycle paths from checking CSRF headers
  if (
    req.originalUrl === "/api/auth/refresh" || 
    req.originalUrl === "/api/auth/csrf"
  ) {
    return next();
  }
  return csrfProtection(req, res, next);
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

// ─── Production Frontend ────────────────────────────────────────────────────
const frontendDistPath = path.resolve(process.cwd(), "public");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const shouldServeFrontend = env.NODE_ENV === "production" && fs.existsSync(frontendIndexPath);

if (shouldServeFrontend) {
  app.use(express.static(frontendDistPath, { index: false }));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || !["GET", "HEAD"].includes(req.method)) {
      return next();
    }

    res.sendFile(frontendIndexPath);
  });
}

// ─── Event Listeners ────────────────────────────────────────────────────────
registerNotificationListeners();

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new NotFoundError("Route not found"));
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

export { app };
