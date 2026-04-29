import { z } from 'zod'

import {
  GENDERS,
  DESIGNATIONS,
} from '../../db/constants.js'

// General data for both students and teachers
export const userCreateSchema = z.object({
  fullName: z.string().min(3).max(100), // db allows max 100 characters
  personalEmail: z.email(),
  universityEmail: z.email().optional(),
  phone: z.string().min(5).max(20), // db allows max 20 characters
  password: z.string(),

  gender: z.enum(GENDERS),
  profilePictureUrl: z.url().optional(),
  bio: z.string().max(1000).optional(), // db allows max 1000 characters
})

export const studentCreateSchema = z.object({
  classPublicId: z.uuidv7(),
  rollNumber: z.string(),
}).and(userCreateSchema)

export const teacherCreateSchema = z.object({
  designation: z.enum(DESIGNATIONS),
  departmentId: z.coerce.number().positive(),
}).and(userCreateSchema)