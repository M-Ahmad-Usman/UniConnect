// Express
import { Router } from 'express'
import type { Request, Response } from 'express'

// Services
import type SocietyService from './society.service.js'

// Validations
import { validate, validateContentType } from '../../core/middleware/index.js'
import { createSocietySchema } from './society.schema.js'

// DTO Types
import type { CreateSocietyRequest, CreateSocietyResponse } from './society.dto.js'

// API Types
import type { SuccessResponseBody } from '../../core/types/api.js'

export default function createSocietyRouter(societyService: SocietyService): Router {

  const societyRouter = Router()

  societyRouter.post('/',
    validateContentType('application/json'),
    validate(createSocietySchema, 'body'),
    async (req: Request<object, unknown, CreateSocietyRequest>, res: Response) => {

      const societyResponse: CreateSocietyResponse = await societyService.createSociety(req.body)

      const resBody: SuccessResponseBody<CreateSocietyResponse> = {
        success: true,
        data: societyResponse,
      }

      res.status(201).json(resBody)
    },
  )

  return societyRouter
}