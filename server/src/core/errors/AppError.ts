import { ERROR_TYPES } from './errorType.js'
import type { ErrorType } from './errorType.js'
import type { FieldError } from '../types/api.js'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly type: ErrorType

  public readonly isOperational: boolean

  constructor(message: string, statusCode: number, type: ErrorType, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.type = type
    this.isOperational = isOperational
    // Restores the correct prototype chain, required when extending built-ins in TS
    Object.setPrototypeOf(this, new.target.prototype)
    // Captures a clean stack trace that starts at the throw site, not here
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, ERROR_TYPES.NOT_FOUND)
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, ERROR_TYPES.BAD_REQUEST)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, ERROR_TYPES.UNAUTHORIZED)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, ERROR_TYPES.FORBIDDEN)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, ERROR_TYPES.CONFLICT)
  }
}

// ValidationError is special — it carries field-level details from Zod
// so the client knows exactly which fields failed and why.
export class ValidationError extends AppError {
  public readonly details: FieldError[]

  constructor(details: FieldError[], message = 'Validation failed') {
    super(message, 422, ERROR_TYPES.VALIDATION_FAILED)
    this.details = details
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    // isOperational = false signals this is a programmer error, not a user error
    super(message, 500, ERROR_TYPES.INTERNAL_SERVER_ERROR, false)
  }
}