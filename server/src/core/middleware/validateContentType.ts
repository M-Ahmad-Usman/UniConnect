import { InvalidContentTypeError } from '../errors/AppError.js'

import type { Request, Response, NextFunction } from 'express'
import type { ContentType } from '../types/contentType.js'

export const validateContentType = (contentType: ContentType) => {

  return (request: Request, _response: Response, next: NextFunction) => {
    const receivedContentType = request.get('Content-Type') ?? 'none'

    if (!request.is(contentType))
      next(new InvalidContentTypeError(`Content-Type: "${contentType}" expected, got ${receivedContentType} instead.`))
    else
      next()
  }

}