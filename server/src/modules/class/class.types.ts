import type { createClassSchema } from './class.schema.js'
import type { z } from 'zod'

export type CreateClass = z.infer<typeof createClassSchema>