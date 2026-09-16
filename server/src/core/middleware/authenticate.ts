import { BadRequestError } from '../errors/AppError.js'
import { verifyAccessToken } from '../security/token.js'

// Error Translators
import { translateJwtError } from '../errors/translators.js'

import type { Request, Response, NextFunction } from 'express'

const BEARER_REGEX = /^Bearer\s+([A-Za-z0-9\-_.~+/]+=*)$/i

const extractBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null
  const match = BEARER_REGEX.exec(authHeader)
  return match?.[1] ?? null
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req.get('authorization'))
  if (!token)
    return next(new BadRequestError('JWT Token with format "Bearer <token>" is required'))

  let payload
  try {
    payload = verifyAccessToken(token)
  } catch (error: unknown) {
    throw translateJwtError(error)
  }

  req.user = { publicId: payload.sub }

  next()
}