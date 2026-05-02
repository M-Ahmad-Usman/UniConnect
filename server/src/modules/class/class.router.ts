// Express
import { Router } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { Request, Response } from 'express'

// Services
import type ClassService from './class.service.js'

// Validations
import { validate, validateContentType } from '../../core/middleware/index.js'
import { createClassSchema } from './class.schema.js'

// Types
import type { CreateClass } from './class.types.js'
import type { SuccessResponseBody } from '../../core/types/api.js'

export default function createClassRouter(classService: ClassService) {

  const classRouter = Router()

  classRouter.post('/',
    validateContentType('application/json'),
    validate(createClassSchema),
    async (req: Request<ParamsDictionary, unknown, CreateClass>, res: Response) => {

      const newClass = await classService.createClass(req.body)

      const resBody: SuccessResponseBody<typeof newClass> = {
        success: true,
        data: newClass,
      }

      res.status(201).json(resBody)
    },
  )

  return classRouter
}