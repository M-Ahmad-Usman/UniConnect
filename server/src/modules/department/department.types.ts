
import type { createDepartmentSchema } from './department.schema.js'
import type { z } from 'zod'

export type CreateDepartment = z.infer<typeof createDepartmentSchema>
