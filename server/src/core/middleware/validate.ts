import { ValidationError } from '../errors/AppError.js'
import { translateZodError } from '../errors/translators.js'

import type { Request, Response, NextFunction } from 'express'
import type { z } from 'zod'

type ValidationSource = 'body' | 'query' | 'params'

export const validate = (
  schema: z.ZodType,
  target: ValidationSource = 'body',
) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request[target])

    if (!result.success) {
      throw new ValidationError(translateZodError(result.error))
    }

    request[target] = result.data

    next()
  }
}