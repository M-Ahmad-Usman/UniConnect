import type { ErrorType } from './error.js'

export interface SuccessResponseBody<T> {
  success: true,
  data: T
  meta?: Record<string, unknown>
}

export interface ErrorResponseBody<TDetails = unknown> {
  success: false
  error: {
    message: string
    type: ErrorType
    details?: TDetails
  }
}

// The shape of a single field-level zod validation error
export interface FieldError {
  field: string // dot-notation path, e.g. "address.city"
  message: string
  code: string // Zod's issue code, useful for client-side i18n
}