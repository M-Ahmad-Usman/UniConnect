// Express Types
import { Router } from 'express'
import type { Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'

// Services
import type DepartmentService from './department.service.js'

// Validations
import { validate, validateContentType } from '../../core/middleware/index.js'
import { createDepartmentSchema } from './department.schema.js'

// Data Types
import type { CreateDepartmentRequest, CreateDepartmentResponse } from './department.dto.js'
import type { SuccessResponseBody } from '../../core/types/api.js'

export default function createDepartmentRouter(departmentService: DepartmentService) {

  const departmentRouter = Router()

  departmentRouter.post('/',
    validateContentType('application/json'),
    validate(createDepartmentSchema),
    async (req: Request<ParamsDictionary, unknown, CreateDepartmentRequest>, res: Response) => {

      const departmentResponse: CreateDepartmentResponse = await departmentService.createDepartment(req.body)

      const resBody: SuccessResponseBody<CreateDepartmentResponse> = {
        success: true,
        data: departmentResponse,
      }

      res.status(201).json(resBody)
    },
  )

  return departmentRouter
}