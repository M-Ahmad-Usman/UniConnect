import type { z } from 'zod'
import type { batchCurriculum } from './program.schema.js'

export type BatchCurriculum = z.infer<typeof batchCurriculum>