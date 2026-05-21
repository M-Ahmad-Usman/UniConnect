import { StatusCodes, getReasonPhrase } from "http-status-codes";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>[];

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code: string = "INTERNAL_ERROR",
    details?: Record<string, unknown>[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, StatusCodes.NOT_FOUND, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, StatusCodes.UNAUTHORIZED, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, StatusCodes.FORBIDDEN, "FORBIDDEN");
  }
}

export class CsrfError extends AppError {
  constructor(message: string = "Invalid CSRF token") {
    super(message, StatusCodes.FORBIDDEN, "CSRF_INVALID");
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, StatusCodes.CONFLICT, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = "Validation failed",
    details?: Record<string, unknown>[]
  ) {
    super(message, StatusCodes.BAD_REQUEST, "VALIDATION_ERROR", details);
  }
}
