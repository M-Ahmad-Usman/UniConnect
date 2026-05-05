import type { createProgramSchema } from './program.schema.js'
import type { z } from 'zod'

export type CreateProgram = z.infer<typeof createProgramSchema>