// Express
import { Router } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { Request, Response } from 'express'

// Services
import type ClassService from './class.service.js'

// Validations
import { validate, validateContentType } from '../../core/middleware/index.js'
import { createClassSchema } from './class.schema.js'

// API Types
import type { SuccessResponseBody } from '../../core/types/api.js'

// DTOs
import type { CreateClassRequest, CreateClassResponse } from './class.dto.js'

export default function createClassRouter(classService: ClassService) {

  const classRouter = Router()

  classRouter.post('/',
    validateContentType('application/json'),
    validate(createClassSchema),
    async (req: Request<ParamsDictionary, unknown, CreateClassRequest>, res: Response) => {

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