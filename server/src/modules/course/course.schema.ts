import { z } from 'zod'

import { coursesVarcharSizes } from '../../db/constants.js'

export const createCourseSchema = z.object({
  title: z.string().trim().min(3).max(coursesVarcharSizes.title),
  code: z.string().trim().min(2).max(coursesVarcharSizes.code),
  creditHours: z.coerce.number().gte(0).max(3), // In NTU, a course can be of maximum 3 credit hours

  departmentId: z.coerce.number().positive(),
})