import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import {
  ApiErrorCode,
  AppError,
  ConflictError,
  NotFoundError,
} from "../shared/errors/index.js";
import { env } from "../config/env.js";
import { captureException } from "../config/telemetry.js";
import { getModuleLogger } from "../config/logger.js";

// Prisma error codes
const PRISMA_UNIQUE_CONSTRAINT = "P2002";
const PRISMA_NOT_FOUND = "P2025";
const errorLogger = getModuleLogger("error");

interface PrismaKnownRequestError {
  code: string;
  meta?: { target?: string[] | string };
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

function normalizeTarget(target: string[] | string | undefined): string {
  if (Array.isArray(target)) {
    return target.join(",");
  }

  return target ?? "";
}

function mapUniqueConstraint(req: Request, error: PrismaKnownRequestError): ConflictError {
  const target = normalizeTarget(error.meta?.target);
  const path = req.path;

  if (target === "email") {
    return new ConflictError("A user with this email already exists", ApiErrorCode.DUPLICATE_EMAIL);
  }

  if (target === "rollNumber") {
    return new ConflictError("A student with this roll number already exists", ApiErrorCode.DUPLICATE_ROLL_NUMBER);
  }

  if (path.includes("/departments") && target === "code") {
    return new ConflictError(
      "A department with this code already exists",
      ApiErrorCode.DUPLICATE_DEPARTMENT_CODE
    );
  }

  if (path.includes("/programs") && target === "code") {
    return new ConflictError(
      "A program with this code already exists",
      ApiErrorCode.DUPLICATE_PROGRAM_CODE
    );
  }

  if (path.includes("/courses") && target === "code") {
    return new ConflictError("A course with this code already exists", ApiErrorCode.DUPLICATE_COURSE_CODE);
  }

  if (path.includes("/societies") && target === "name") {
    return new ConflictError(
      "A society with this name already exists",
      ApiErrorCode.DUPLICATE_SOCIETY_NAME
    );
  }

  return new ConflictError("A record with these values already exists");
}

function sendError(
  res: Response,
  statusCode: number,
  error: { code: string; message: string; details?: Record<string, unknown>[] },
  requestId: string | undefined
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(requestId && { requestId }),
    },
  });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId;

  // Handle AppError instances
  if (err instanceof AppError) {
    sendError(
      res,
      err.statusCode,
      {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      requestId
    );
    return;
  }

  // Handle Prisma errors
  if (isPrismaKnownRequestError(err)) {
    if (err.code === PRISMA_UNIQUE_CONSTRAINT) {
      const conflictError = mapUniqueConstraint(req, err);
      sendError(
        res,
        conflictError.statusCode,
        { code: conflictError.code, message: conflictError.message },
        requestId
      );
      return;
    }

    if (err.code === PRISMA_NOT_FOUND) {
      const notFoundError = new NotFoundError("Record not found");
      sendError(
        res,
        notFoundError.statusCode,
        { code: notFoundError.code, message: notFoundError.message },
        requestId
      );
      return;
    }
  }

  // Log unexpected errors
  const logger = req.log ?? errorLogger;
  logger.error(
    {
      err,
      requestId,
      method: req.method,
      path: req.path,
      route: req.route && typeof req.route.path === "string" ? `${req.baseUrl}${req.route.path}` : req.path,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      userId: req.user?.id,
    },
    "Unhandled request error",
  );
  captureException(err, { requestId, path: req.path, method: req.method });

  // Generic fallback
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: ApiErrorCode.INTERNAL_ERROR,
      message: "An unexpected error occurred",
      ...(requestId && { requestId }),
      ...(env.NODE_ENV !== "production" && { debug: err.message }),
    },
  });
}
