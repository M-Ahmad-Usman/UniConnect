import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { NotFoundError } from "./shared/errors/index.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import departmentRoutes from "./modules/department/department.routes.js";
import programRoutes from "./modules/program/program.routes.js";
import disciplineRoutes from "./modules/discipline/discipline.routes.js";
import classRoutes from "./modules/class/class.routes.js";
import courseRoutes from "./modules/course/course.routes.js";
import societyRoutes from "./modules/society/society.routes.js";
import roleRoutes from "./modules/role/role.routes.js";
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

// ─── Security & Parsing Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ─── Health Check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "OK" });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/disciplines", disciplineRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/societies", societyRoutes);
app.use("/api/roles", roleRoutes);
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
