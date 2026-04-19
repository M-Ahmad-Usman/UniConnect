import type { ErrorType } from '../errors/errorType.js'

export interface ErrorResponseBody {
  success: false
  error: {
    message: string
    errorType: ErrorType
  }
}

export interface ValidationErrorResponseBody extends ErrorResponseBody {
  error: ErrorResponseBody['error'] & { details: FieldError[] }
}

// The shape of a single field-level zod validation error
export interface FieldError {
  field: string // dot-notation path, e.g. "address.city"
  message: string
  code: string // Zod's issue code, useful for client-side i18n
}