// Express
import { Router } from 'express'
import type { Request, Response } from 'express'

// Services
import type DepartmentService from './department.service.js'

// Validations
import { validate, validateContentType } from '../../core/middleware/index.js'
import { createDepartmentSchema, createCourseSchema } from './department.schema.js'

// DTO Types
import type {
  CreateCourseRequest,
  CreateCourseResponse,
  CreateDepartmentRequest,
  CreateDepartmentResponse,
} from './department.dto.js'

// API Types
import type { SuccessResponseBody } from '../../core/types/api.js'

export default function createDepartmentRouter(departmentService: DepartmentService) {

  const departmentRouter = Router()

  departmentRouter.post('/',
    validateContentType('application/json'),
    validate(createDepartmentSchema),
    async (req: Request<object, unknown, CreateDepartmentRequest>, res: Response) => {

      const createDepartmentResponse = await departmentService.createDepartment(req.body)

      const resBody: SuccessResponseBody<CreateDepartmentResponse> = {
        success: true,
        data: createDepartmentResponse,
      }

      res.status(201).json(resBody)
    },
  )

  departmentRouter.post('/courses',
    validateContentType('application/json'),
    validate(createCourseSchema),
    async (req: Request<object, unknown, CreateCourseRequest>, res: Response) => {

      const createCourseResponse = await departmentService.createCourse(req.body)

      const resBody: SuccessResponseBody<CreateCourseResponse> = {
        success: true,
        data: createCourseResponse,
      }

      res.status(201).json(resBody)
    },
  )

  return departmentRouter
}