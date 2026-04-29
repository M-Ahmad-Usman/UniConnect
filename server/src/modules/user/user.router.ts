import { Router } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { Request, Response } from 'express'

import { teacherCreateSchema } from './user.schema.js'
import { validate, validateContentType } from '../../core/middleware/index.js'
import type { z } from 'zod'

import type { SuccessResponseBody } from '../../core/types/api.js'

import type UserService from './user.service.js'

export function createUserRouter(userService: UserService): Router {

  const userRouter = Router()

  userRouter.post('/teachers',
    validateContentType('application/json'),
    validate(teacherCreateSchema),
    async (req: Request<ParamsDictionary, unknown, z.infer<typeof teacherCreateSchema>>, res: Response) => {

      const newTeacher = await userService.createTeacher(req.body)

      const resBody: SuccessResponseBody<typeof newTeacher> = {
        success: true,
        data: newTeacher,
      }

      res.status(201).json(resBody)
    },
  )

  return userRouter
}