import type { ErrorType } from '../types/error.js'
import type { FieldError } from '../types/api.js'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly type: ErrorType

  public readonly isOperational: boolean
  public readonly details: FieldError[]

  constructor(options: {
    message: string,
    statusCode: number,
    type: ErrorType,
    details?: FieldError[],
    isOperational?: boolean,
    cause?: unknown
  }) {

    super(options.message, { cause: options.cause })

    this.statusCode = options.statusCode
    this.type = options.type
    this.isOperational = options.isOperational ?? true
    this.details = options.details ?? []

    // Restores the correct prototype chain, required when extending built-ins in TS
    Object.setPrototypeOf(this, new.target.prototype)
    // Captures a clean stack trace that starts at the throw site, not here
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', cause?: unknown) {
    super({ message, statusCode: 404, type: 'NOT_FOUND', cause })
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', cause?: unknown) {
    super({ message, statusCode: 400, type: 'BAD_REQUEST', cause })
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required', cause?: unknown) {
    super({ message, statusCode: 401, type: 'UNAUTHENTICATED', cause })
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token expired. Please login again.', cause?: unknown) {
    super({ message, statusCode: 401, type: 'TOKEN_EXPIRED', cause })
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions', cause?: unknown) {
    super({ message, statusCode: 403, type: 'FORBIDDEN', cause })
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', cause?: unknown) {
    super({ message, statusCode: 409, type: 'CONFLICT', cause })
  }
}

// ValidationError is special — it carries field-level details from Zod
// so the client knows exactly which fields failed and why.
export class ValidationError extends AppError {
  constructor(details: FieldError[], message = 'Validation failed', cause?: unknown) {
    super({ details, message, statusCode: 422, type: 'VALIDATION_FAILED', cause })
  }
}

export class InvalidContentTypeError extends AppError {
  constructor(message = 'Content Type is not supported', cause?: unknown) {
    super({ message, statusCode: 415, type: 'INVALID_CONTENT_TYPE', cause })
  }
}

export class InternalServerError extends AppError {
  // cause is required here so that the actual cause can be inspected
  constructor(message = 'An unexpected error occurred', cause: unknown) {
  // isOperational = false signals this is a programmer error, not a user error
    super({ message, statusCode: 500, type: 'INTERNAL_SERVER_ERROR', isOperational: false, cause })
  }
}