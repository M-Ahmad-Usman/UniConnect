import rateLimit from "express-rate-limit";

// ─── Auth Limiter ───────────────────────────────────────────────────────────
// Used on: POST /api/auth/login, /forgot-password, /reset-password

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many attempts. Try again in 15 minutes.",
    },
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
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Slow down.",
    },
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
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many upload requests.",
    },
  },
  skip: () => process.env.NODE_ENV === "test",
});
