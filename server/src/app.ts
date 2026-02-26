import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { NotFoundError } from "./shared/errors/index.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";

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

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new NotFoundError("Route not found"));
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

export { app };
