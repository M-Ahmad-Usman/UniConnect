import rateLimit from "express-rate-limit";
import { ApiErrorCode } from "../shared/errors/index.js";

function rateLimitResponse(message: string, requestId: string | undefined) {
  return {
    success: false,
    error: {
      code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      ...(requestId && { requestId }),
    },
  };
}

// ─── Auth Limiter ───────────────────────────────────────────────────────────
// Used on: POST /api/auth/login, /forgot-password, /reset-password

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res
      .status(429)
      .json(rateLimitResponse("Too many attempts. Try again in 15 minutes.", req.requestId));
  },
  skip: () => process.env.NODE_ENV === "test",
});

// ─── General Limiter ────────────────────────────────────────────────────────
// Used on: all /api/* routes

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(rateLimitResponse("Too many requests. Slow down.", req.requestId));
  },
  skip: () => process.env.NODE_ENV === "test",
});

// ─── Upload Limiter ─────────────────────────────────────────────────────────
// Used on: file upload endpoints

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(rateLimitResponse("Too many upload requests.", req.requestId));
  },
  skip: () => process.env.NODE_ENV === "test",
});
