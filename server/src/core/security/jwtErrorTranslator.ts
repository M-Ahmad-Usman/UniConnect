import jwt from 'jsonwebtoken'

import {
  InternalServerError,
  TokenExpiredError,
  UnauthenticatedError,
} from '../errors/AppError.js'

import type { AppError } from '../errors/AppError.js'

export const translateJwtError = (error: unknown): AppError => {
  if (error instanceof jwt.TokenExpiredError)
    return new TokenExpiredError('Token is expired', error)
  else if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError)
    return new UnauthenticatedError('Invalid token', error)
  else
    // Shouldn't happen
    return new InternalServerError('Something went wrong', error)
}