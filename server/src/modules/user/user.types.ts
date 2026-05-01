import type { z } from 'zod'
import type { createTeacherSchema, createStudentSchema } from './user.schema.js'

export type CreateTeacher = z.infer<typeof createTeacherSchema>
export type CreateStudent = z.infer<typeof createStudentSchema>