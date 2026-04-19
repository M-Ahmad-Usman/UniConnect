
export const ERROR_TYPES = {
  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',   // Not authenticated
  FORBIDDEN: 'FORBIDDEN',      // Authenticated but not permitted
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_TOKEN_REUSE: 'REFRESH_TOKEN_REUSE', // Token family theft detection

  // Resources
  CONFLICT: 'CONFLICT',       // e.g. duplicate email

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const

export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES]