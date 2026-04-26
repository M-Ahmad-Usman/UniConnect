import type { ErrorType } from '../types/error.js'
import type { FieldError } from '../types/api.js'
import type { ContentType } from '../types/contentType.js'

export class AppError<TDetails = unknown> extends Error {
  public readonly statusCode: number
  public readonly type: ErrorType

  public readonly isOperational: boolean
  public readonly details: TDetails | undefined

  constructor(
    message: string,
    statusCode: number,
    type: ErrorType,
    isOperational = true,
    details?: TDetails,
  ) {
    super(message)
    this.statusCode = statusCode
    this.type = type
    this.isOperational = isOperational
    this.details = details

    // Restores the correct prototype chain, required when extending built-ins in TS
    Object.setPrototypeOf(this, new.target.prototype)
    // Captures a clean stack trace that starts at the throw site, not here
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT')
  }
}

// ValidationError is special — it carries field-level details from Zod
// so the client knows exactly which fields failed and why.
export class ValidationError extends AppError<FieldError[]> {
  constructor(details: FieldError[], message = 'Validation failed') {
    super(message, 422, 'VALIDATION_FAILED', true, details)
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    // isOperational = false signals this is a programmer error, not a user error
    super(message, 500, 'INTERNAL_SERVER_ERROR', false)
  }
}

export class InvalidContentTypeError extends AppError<{ allowedContentType: ContentType }> {
  constructor(allowedContentType: ContentType, message = 'Content Type is not supported') {
    super(message, 415, 'INVALID_CONTENT_TYPE', true, { allowedContentType })
  }
}