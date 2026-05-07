
// Express
import { Router } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { Request, Response } from 'express'

// Services
import type CourseService from './course.service.js'

// Validations
import { validate, validateContentType } from '../../core/middleware/index.js'

// Data Types
import type { CreateCourse } from './course.types.js'
import type { SuccessResponseBody } from '../../core/types/api.js'
import { createCourseSchema } from './course.schema.js'

export default function createCourseRouter(courseService: CourseService): Router {

  const courseRouter = Router()

  courseRouter.post('/',
    validateContentType('application/json'),
    validate(createCourseSchema),
    async (req: Request<ParamsDictionary, unknown, CreateCourse>, res: Response) => {

      const newCourse = await courseService.createCourse(req.body)

      const resBody: SuccessResponseBody<typeof newCourse> = {
        success: true,
        data: newCourse,
      }

      res.status(201).json(resBody)
    },
  )

  return courseRouter

}