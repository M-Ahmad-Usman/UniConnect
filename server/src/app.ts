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

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new NotFoundError("Route not found"));
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

export { app };
