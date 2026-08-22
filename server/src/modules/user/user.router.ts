// Express Types
import { Router } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { Request, Response } from 'express'

// Services
import type UserService from './user.service.js'

// Validations
import { validate, validateContentType } from '../../core/middleware/index.js'
import { createTeacherSchema, createStudentSchema } from './user.schema.js'

// Data Types
import type { SuccessResponseBody } from '../../core/types/api.js'
import type {
  CreateStudentRequest,
  StudentResponse,
  CreateTeacherRequest,
  TeacherResponse,
} from './user.dto.js'

export default function createUserRouter(userService: UserService): Router {

  const userRouter = Router()

  userRouter.post('/teachers',
    validateContentType('application/json'),
    validate(createTeacherSchema),
    async (req: Request<ParamsDictionary, unknown, CreateTeacherRequest>, res: Response) => {

      const teacherResponse = await userService.createTeacher(req.body)

      const resBody: SuccessResponseBody<TeacherResponse> = {
        success: true,
        data: teacherResponse,
      }

      res.status(201).json(resBody)
    },
  )

  userRouter.post('/students',
    validateContentType('application/json'),
    validate(createStudentSchema),
    async (req: Request<ParamsDictionary, unknown, CreateStudentRequest>, res: Response) => {

      const studentResponse = await userService.createStudent(req.body)

      const resBody: SuccessResponseBody<StudentResponse> = {
        success: true,
        data: studentResponse,
      }

      res.status(201).json(resBody)
    },
  )

  return userRouter
}