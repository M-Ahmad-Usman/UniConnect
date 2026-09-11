import { z } from 'zod'

import {
  departmentsVarcharSizes,
  serversVarcharSizes,
  coursesVarcharSizes,
} from '../../db/constants.js'

export const createDepartmentSchema = z.object({
  // department details
  name: z.string().min(10).max(departmentsVarcharSizes.name),
  code: z.string().min(2).max(departmentsVarcharSizes.code),

  // department server details
  server: z.object({
    name: z.string().min(5).max(serversVarcharSizes.name), // db allows max 100 characters
    description: z.string().max(serversVarcharSizes.description).optional(),
    iconUrl: z.string().optional(), // TODO: Implement media handling
  }),
})

export const createCourseSchema = z.object({
  title: z.string().trim().min(3).max(coursesVarcharSizes.title),
  code: z.string().trim().min(2).max(coursesVarcharSizes.code),
  creditHours: z.coerce.number().gte(0).max(3), // In NTU, a course can be of maximum 3 credit hours

  departmentId: z.coerce.number().positive(),
})