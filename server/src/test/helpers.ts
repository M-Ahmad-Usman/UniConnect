import type { SuccessResponseBody, ErrorResponseBody, FieldError } from '../core/types/api.js'
import type { Response } from 'supertest'

export function assertSuccessBody<T>(res: Response): SuccessResponseBody<T> {
  return res.body as SuccessResponseBody<T>
}

export function assertErrorBody(res: Response): ErrorResponseBody {
  return res.body as ErrorResponseBody
}

/**
 * Narrows an optional value (like error.details, which is genuinely
 * undefined for non-validation errors) to non-null, with a real runtime
 * check backing the narrowing — unlike `value!`, this fails loudly with a
 * clear message if the assumption is ever wrong instead of crashing later
 * with a confusing "undefined is not iterable"-style error.
 */
export function expectDefined<T>(
  value: T,
  message = 'Expected value to be defined, but got undefined/null',
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message)
  }
}

export function findFieldError(
  fieldErrors: FieldError[],
  field: string,
): FieldError | undefined {
  return fieldErrors.find(fieldError => fieldError.field === field)
}