// Express Types
import { Router } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { Request, Response } from 'express'

// Validations & Data Types
import { createTeacherSchema, createStudentSchema } from './user.schema.js'
import { validate, validateContentType } from '../../core/middleware/index.js'
import type { CreateStudent, CreateTeacher } from './user.types.js'
import type { SuccessResponseBody } from '../../core/types/api.js'

// Services
import type UserService from './user.service.js'

export function createUserRouter(userService: UserService): Router {

  const userRouter = Router()

  userRouter.post('/teachers',
    validateContentType('application/json'),
    validate(createTeacherSchema),
    async (req: Request<ParamsDictionary, unknown, CreateTeacher>, res: Response) => {

      const newTeacher = await userService.createTeacher(req.body)

      const resBody: SuccessResponseBody<typeof newTeacher> = {
        success: true,
        data: newTeacher,
      }

      res.status(201).json(resBody)
    },
  )

  userRouter.post('/students',
    validateContentType('application/json'),
    validate(createStudentSchema),
    async (req: Request<ParamsDictionary, unknown, CreateStudent>, res: Response) => {

      const newStudent = await userService.createStudent(req.body)

      const resBody: SuccessResponseBody<typeof newStudent> = {
        success: true,
        data: newStudent,
      }

      res.status(201).json(resBody)
    },
  )

  return userRouter
}