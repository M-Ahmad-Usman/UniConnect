import { z } from 'zod'

export const createCourseSchema = z.object({
  title: z.string().trim().min(3).max(100), // db allows max 100 characters
  code: z.string().trim().min(2).max(50), // db allows max 50 characters
  creditHours: z.coerce.number().gte(0).max(3), // In NTU, a course can be of maximum 3 credit hours

  departmentId: z.coerce.number().positive(),
})