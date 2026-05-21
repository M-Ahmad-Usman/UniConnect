import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError, ConflictError, NotFoundError } from "../shared/errors/index.js";
import { env } from "../config/env.js";

// Prisma error codes
const PRISMA_UNIQUE_CONSTRAINT = "P2002";
const PRISMA_NOT_FOUND = "P2025";

interface PrismaKnownRequestError {
  code: string;
  meta?: { target?: string[] };
  message: string;
}

function isPrismaKnownRequestError(error: unknown): error is PrismaKnownRequestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as PrismaKnownRequestError).code === "string"
  );
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Handle Prisma errors
  if (isPrismaKnownRequestError(err)) {
    if (err.code === PRISMA_UNIQUE_CONSTRAINT) {
      const conflictError = new ConflictError(
        "A record with these values already exists"
      );
      res.status(conflictError.statusCode).json({
        success: false,
        error: {
          code: conflictError.code,
          message: conflictError.message,
        },
      });
      return;
    }

    if (err.code === PRISMA_NOT_FOUND) {
      const notFoundError = new NotFoundError("Record not found");
      res.status(notFoundError.statusCode).json({
        success: false,
        error: {
          code: notFoundError.code,
          message: notFoundError.message,
        },
      });
      return;
    }
  }

  // Log unexpected errors
  console.error("[ERROR] Unhandled error", { error: err });

  // Generic fallback
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      ...(env.NODE_ENV !== "production" && { debug: err.message }),
    },
  });
}
