import { z } from 'zod'

export const createDepartmentSchema = z.object({
  // department details
  name: z.string().min(10).max(100), // db allows max 100 characters
  code: z.string().min(2).max(20), // db allows max 20 characters

  // department server details
  serverName: z.string().min(5).max(100), // db allows max 100 characters
  description: z.string().optional(), // TODO: Set maximum allowed characters
  iconUrl: z.string().optional(), // TODO: Implement media handling

})