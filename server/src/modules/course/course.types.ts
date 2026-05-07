import type { createCourseSchema } from './course.schema.js'
import type { z } from 'zod'

export type CreateCourse = z.infer<typeof createCourseSchema>