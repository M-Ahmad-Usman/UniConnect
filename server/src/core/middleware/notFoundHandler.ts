import { NotFoundError } from '../errors/AppError.js'

import type { Request, Response, NextFunction } from 'express'

export function notFoundHandler(request: Request, _response: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${request.method} ${request.path} not found`))
}