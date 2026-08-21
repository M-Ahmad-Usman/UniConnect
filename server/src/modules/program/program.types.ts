import type { z } from 'zod'
import type {
  createProgramSchema,
  batchCurriculum,
  createProgramCurriculaSchema,
} from './program.schema.js'

export type CreateProgram = z.infer<typeof createProgramSchema>
export type BatchCurriculum = z.infer<typeof batchCurriculum>
export type CreateProgramCurricula = z.infer<typeof createProgramCurriculaSchema>