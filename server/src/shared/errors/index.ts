import { StatusCodes, getReasonPhrase } from "http-status-codes";

export const ApiErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CSRF_INVALID: "CSRF_INVALID",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DUPLICATE_EMAIL: "DUPLICATE_EMAIL",
  DUPLICATE_DEPARTMENT_CODE: "DUPLICATE_DEPARTMENT_CODE",
  DUPLICATE_PROGRAM_CODE: "DUPLICATE_PROGRAM_CODE",
  DUPLICATE_COURSE_CODE: "DUPLICATE_COURSE_CODE",
  DUPLICATE_SOCIETY_NAME: "DUPLICATE_SOCIETY_NAME",
  DUPLICATE_ROLL_NUMBER: "DUPLICATE_ROLL_NUMBER",
  RESOURCE_IN_USE: "RESOURCE_IN_USE",
  SCOPE_FORBIDDEN: "SCOPE_FORBIDDEN",
  PASSWORD_CHANGE_REQUIRED: "PASSWORD_CHANGE_REQUIRED",
  CLASS_GRADUATED: "CLASS_GRADUATED",
  SOCIETY_SUSPENDED: "SOCIETY_SUSPENDED",
  CLASS_FINAL_SEMESTER_REQUIRED: "CLASS_FINAL_SEMESTER_REQUIRED",
  CURRICULUM_TEACHER_ASSIGNMENT_REQUIRED: "CURRICULUM_TEACHER_ASSIGNMENT_REQUIRED",
  ALREADY_MEMBER: "ALREADY_MEMBER",
  JOIN_REQUEST_PENDING: "JOIN_REQUEST_PENDING",
  CHANNEL_LOCKED: "CHANNEL_LOCKED",
  CHANNEL_ARCHIVED: "CHANNEL_ARCHIVED",
  EDIT_WINDOW_EXPIRED: "EDIT_WINDOW_EXPIRED",
  UPLOAD_FILE_TOO_LARGE: "UPLOAD_FILE_TOO_LARGE",
  UPLOAD_UNSUPPORTED_TYPE: "UPLOAD_UNSUPPORTED_TYPE",
  UPLOAD_IMAGE_TOO_LARGE: "UPLOAD_IMAGE_TOO_LARGE",
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly details?: Record<string, unknown>[];

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR,
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
  constructor(message: string = "Resource not found", code: ApiErrorCode = ApiErrorCode.NOT_FOUND) {
    super(message, StatusCodes.NOT_FOUND, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", code: ApiErrorCode = ApiErrorCode.UNAUTHORIZED) {
    super(message, StatusCodes.UNAUTHORIZED, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", code: ApiErrorCode = ApiErrorCode.FORBIDDEN) {
    super(message, StatusCodes.FORBIDDEN, code);
  }
}

export class CsrfError extends AppError {
  constructor(message: string = "Invalid CSRF token") {
    super(message, StatusCodes.FORBIDDEN, ApiErrorCode.CSRF_INVALID);
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = "Resource already exists",
    code: ApiErrorCode = ApiErrorCode.CONFLICT,
    details?: Record<string, unknown>[]
  ) {
    super(message, StatusCodes.CONFLICT, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = "Validation failed",
    details?: Record<string, unknown>[],
    code: ApiErrorCode = ApiErrorCode.VALIDATION_ERROR
  ) {
    super(message, StatusCodes.BAD_REQUEST, code, details);
  }
}
