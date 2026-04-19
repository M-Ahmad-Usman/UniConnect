import { ValidationError } from '../errors/AppError.js'
import { formatZodError } from '../utils/formatZodError.js'

import type { Request, Response, NextFunction } from 'express'
import type { z } from 'zod'

type ValidationSource = 'body' | 'query' | 'params'

export const validationHandler = (
  schema: z.ZodType,
  target: ValidationSource = 'body',
) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request[target])

    if (!result.success) {
      throw new ValidationError(formatZodError(result.error))
    }

    request[target] = result.data

    next()
  }
}