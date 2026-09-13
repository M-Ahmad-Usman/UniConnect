import { z } from 'zod'
import { societiesVarcharSizes, serversVarcharSizes } from '../../db/constants.js'

export const createSocietySchema = z.object({
  name: z.string().trim().min(2).max(societiesVarcharSizes.name),
  description: z.string().trim().max(societiesVarcharSizes.description).optional(),

  departmentId: z.number(),
  presidentPublicId: z.uuidv7(),
  convenorPublicId: z.uuidv7(),

  // society server details
  server: z.object({
    name: z.string().min(5).max(serversVarcharSizes.name),
    description: z.string().max(serversVarcharSizes.description).optional(),
    iconUrl: z.string().optional(), // TODO: Implement media handling
  }),
})