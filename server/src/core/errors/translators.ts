import jwt from 'jsonwebtoken'

import {
  InternalServerError,
  TokenExpiredError,
  UnauthenticatedError,
} from './AppError.js'

import type { z } from 'zod'

import type { FieldError } from '../types/api.js'
import type { AppError } from './AppError.js'

export const translateJwtError = (error: unknown): AppError => {
  if (error instanceof jwt.TokenExpiredError)
    return new TokenExpiredError('Token is expired', error)
  else if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError)
    return new UnauthenticatedError('Invalid token', error)
  else
    // Shouldn't happen
    return new InternalServerError('Something went wrong', error)
}

export function translateZodError(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => {
    // issue.path is an array like ["address", "city"] or ["items", 0, "price"]
    // We join it into "address.city" or "items.0.price" — readable and parseable
    const field = issue.path.length > 0
      ? issue.path.join('.')
      : '_root' // top-level errors (e.g., wrong type for entire body) get "_root"

    return {
      field,
      message: issue.message,
      code: issue.code,
    }
  })
}