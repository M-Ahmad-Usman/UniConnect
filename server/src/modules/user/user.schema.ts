import { z } from 'zod'

import {
  GENDERS,
  DESIGNATIONS,
} from '../../db/constants.js'

// General data for both students and teachers
const userCreateSchema = z.object({
  fullName: z.string().min(3).max(100), // db allows max 100 characters
  personalEmail: z.email(),
  universityEmail: z.email().optional(),
  phone: z.string().min(5).max(20), // db allows max 20 characters
  password: z.string(),
  passwordHash: z.string().optional(),

  gender: z.enum(GENDERS),
  profilePictureUrl: z.url().optional(),
  bio: z.string().max(1000).optional(), // db allows max 1000 characters
})

export type UserCreateInput = z.infer<typeof userCreateSchema>

export const studentCreateSchema = userCreateSchema.and(z.object({
  studentId: z.coerce.number(),
  classId: z.coerce.number(),
  rollNumber: z.string(),
}))

export type StudentCreateInput = z.infer<typeof studentCreateSchema>

export const teacherCreateSchema = userCreateSchema.and(z.object({
  teacherId: z.coerce.number,
  designation: z.enum(DESIGNATIONS),
  departmentId: z.coerce.number(),
}))

export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>