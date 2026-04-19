import { ZodError } from 'zod'

import { AppError, ValidationError, ConflictError, InternalServerError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import { formatZodError } from '../utils/formatZodError.js'

import type { ErrorResponseBody, ValidationErrorResponseBody } from '../types/api.js'
import type { Request, Response, NextFunction } from 'express'

// pg driver attaches a 'code' property to DB errors.
interface DbError extends Error {
  code?: string
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {

  // 1. Classify
  const appError: AppError = createAppError(error)

  // 2. log
  if (appError.isOperational) {
    // Expected failures — debug level, no stack trace needed
    logger.debug({ type: appError.type, path: request.path }, appError.message)
  }
  else {
    // Log the original error to debug it, then send a safe response
    logger.error({ error, requestId: request.requestId }, 'Unhandled error')
  }

  // 3. Build and send response
  const errorResponseBody = buildErrorResponseBody(appError)
  response.status(appError.statusCode).json(errorResponseBody)

}

function createAppError(error: unknown): AppError {
  if (error instanceof AppError)
    return error

  else if (error instanceof ZodError)
    // Raw Zod error that escaped the validation middleware
    return new ValidationError(formatZodError(error))

  else if (isDbError(error) && error.code === '23505')
    // PostgreSQL unique constraint violation
    return new ConflictError('A resource with these details already exists')

  else
    // Unknown error
    return new InternalServerError()
}

function buildErrorResponseBody(appError: AppError): ErrorResponseBody | ValidationErrorResponseBody {
  if (appError instanceof ValidationError) {
    const body: ValidationErrorResponseBody = {
      success: false,
      error: {
        errorType: appError.type,
        message: appError.message,
        details: appError.details,
      },
    }
    return body
  }
  else {
    const body: ErrorResponseBody = {
      success: false,
      error: {
        errorType: appError.type,
        message: appError.message,
      },
    }
    return body
  }
}

function isDbError(error: unknown): error is DbError {
  return error instanceof Error && 'code' in error
}