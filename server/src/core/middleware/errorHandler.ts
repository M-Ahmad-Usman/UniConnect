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
  error: Error,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {

  let appError: AppError

  // 1. classify the error

  if (error instanceof AppError) {
    appError = error
  }
  else if (error instanceof ZodError) {
    // Raw Zod error that escaped the validation middleware
    appError = new ValidationError(formatZodError(error))
  }
  else if (isDbError(error) && error.code === '23505') {
    // PostgreSQL unique constraint violation
    appError = new ConflictError('A resource with these details already exists')
  }
  else {
    // Unknown error
    // Log the original error so we can debug it, then send a safe response
    logger.error({ error, requestId: request.requestId }, 'Unhandled error')
    appError = new InternalServerError()
  }

  // 2. Log

  if (appError.isOperational) {
    // Expected failures — debug level, no stack trace needed
    logger.debug({ type: appError.type, path: request.path }, appError.message)
  }

  // 3. Build and send response

  if (appError instanceof ValidationError) {
    const body: ValidationErrorResponseBody = {
      success: false,
      error: {
        errorType: appError.type,
        message: appError.message,
        details: appError.details,
      },
    }
    response.status(appError.statusCode).json(body)
  }
  else {
    const body: ErrorResponseBody = {
      success: false,
      error: {
        errorType: appError.type,
        message: appError.message,
      },
    }
    response.status(appError.statusCode).json(body)
  }
}

function isDbError(error: unknown): error is DbError {
  return error instanceof Error && 'code' in error
}