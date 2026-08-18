import { z } from 'zod'

import { GENDERS, usersVarcharSizes, teachersVarcharSizes } from '../../db/constants.js'

// General data for both students and teachers
export const createUserSchema = z.object({
  fullName: z.string().min(3).max(usersVarcharSizes.fullName),
  personalEmail: z.email(),
  universityEmail: z.email().optional(),
  phone: z.string().min(5).max(usersVarcharSizes.phone),
  password: z.string(),

  gender: z.enum(GENDERS),
  profilePictureUrl: z.url().optional(),
  bio: z.string().max(usersVarcharSizes.bio).optional(),
})

export const createStudentSchema = z.object({
  classPublicId: z.uuidv7(),
  rollNumber: z.string(),
}).and(createUserSchema)

export const createTeacherSchema = z.object({
  designation: z.string().max(teachersVarcharSizes.designation).optional(),
  departmentId: z.coerce.number().positive(),
}).and(createUserSchema)