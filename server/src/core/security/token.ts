import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

import { env } from '../../config/env.js'
import { BadRequestError } from '../errors/AppError.js'

interface AccessTokenPayload {
  sub: string
  typ: 'access'
}

export function signAccessToken(userPublicId: string): string {
  const payload: AccessTokenPayload = { sub: userPublicId, typ: 'access' }

  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  })

  if (typeof decoded === 'string' || decoded.typ !== 'access')
    throw new BadRequestError('Unexpected token type')

  return decoded as AccessTokenPayload
}

/**
 * Generates an unguessable, high-entropy refresh token and its HMAC digest.
 *
 * The raw `token` should be transmitted to the client (e.g., in a secure HttpOnly cookie).
 * The `hash` must be saved in the database to prevent plain-text credential leaks.
 *
 * @returns An object containing the raw token and the HMAC-SHA256 hex digest.
 */
export function generateRefreshTokenWithHash(): { token: string, hash: string } {
  const token = crypto.randomBytes(32).toString('base64url')

  const hash = crypto.createHmac('sha256', env.REFRESH_TOKEN_SECRET)
    .update(token)
    .digest('hex')

  return { token, hash }
}