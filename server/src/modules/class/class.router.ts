// Express
import { Router } from 'express'
import type { Request, Response } from 'express'

// Services
import type ClassService from './class.service.js'

// Validations
import { validate, validateContentType } from '../../core/middleware/index.js'
import { createClassSchema } from './class.schema.js'

// DTO Types
import type { CreateClassRequest, CreateClassResponse } from './class.dto.js'

// API Types
import type { SuccessResponseBody } from '../../core/types/api.js'

export default function createClassRouter(classService: ClassService) {

  const classRouter = Router()

  classRouter.post('/',
    validateContentType('application/json'),
    validate(createClassSchema),
    async (req: Request<object, unknown, CreateClassRequest>, res: Response) => {

      const classResponse: CreateClassResponse = await classService.createClass(req.body)

      const resBody: SuccessResponseBody<CreateClassResponse> = {
        success: true,
        data: classResponse,
      }

      res.status(201).json(resBody)
    },
  )

  return classRouter
}