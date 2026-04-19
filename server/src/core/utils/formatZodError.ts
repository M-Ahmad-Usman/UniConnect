import type { z } from 'zod'

import type { FieldError } from '../types/api.js'

export function formatZodError(error: z.ZodError): FieldError[] {
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