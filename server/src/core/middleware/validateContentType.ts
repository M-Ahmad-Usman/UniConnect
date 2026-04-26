import { InvalidContentTypeError } from '../errors/AppError.js'

import type { Request, Response, NextFunction } from 'express'
import type { ContentType } from '../types/contentType.js'

export const validateContentType = (contentType: ContentType) => {

  return (request: Request, _response: Response, next: NextFunction) => {

    if (!request.is(contentType))
      next(new InvalidContentTypeError(contentType, 'Content format is not supported'))
    else
      next()
  }

}