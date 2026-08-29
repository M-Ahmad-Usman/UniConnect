import { z } from 'zod'

import { departmentsVarcharSizes, serversVarcharSizes } from '../../db/constants.js'

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