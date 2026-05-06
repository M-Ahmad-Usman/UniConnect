import type { createProgramSchema, batchCurriculum } from './program.schema.js'
import type { z } from 'zod'

export type CreateProgram = z.infer<typeof createProgramSchema>
export type BatchCurriculum = z.infer<typeof batchCurriculum>