import { ZodError } from 'zod'

import { AppError, ValidationError, InternalServerError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import { formatZodError } from '../utils/formatZodError.js'

import type { ErrorResponseBody } from '../types/api.js'
import type { Request, Response, NextFunction } from 'express'

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

  if (error instanceof ZodError)
    // Raw Zod error that escaped the validation middleware
    return new ValidationError(formatZodError(error))

  // Unknown error
  return new InternalServerError()
}

function buildErrorResponseBody(appError: AppError): ErrorResponseBody {
  const body: ErrorResponseBody = {
    success: false,
    error: {
      type: appError.type,
      message: appError.message,
    },
  }

  if (appError.details !== undefined)
    body.error.details = appError.details

  return body
}