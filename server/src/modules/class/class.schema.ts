import { z } from 'zod'
import { CLASS_SECTIONS } from '../../db/constants.js'

export const createClassSchema = z.object({
  programId: z.coerce.number().positive(),
  currentSemester: z.coerce.number().positive(),
  section: z.enum(CLASS_SECTIONS),

  admissionYear: z.coerce.number().min(2000).max(2100),
})