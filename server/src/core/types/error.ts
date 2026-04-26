export type ErrorType =
  // Generic
  | 'INTERNAL_SERVER_ERROR'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'

  // Auth
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'REFRESH_TOKEN_REUSE'

  // Resources
  | 'CONFLICT'

  // Validation
  | 'VALIDATION_FAILED'

  // Content Type
  | 'INVALID_CONTENT_TYPE'