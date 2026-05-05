import { z } from 'zod'
import { DEGREE_LEVELS, DISCIPLINES } from '../../db/constants.js'

const curriculumEntry = z.object({
  courseId: z.coerce.number().positive(),
  semesterNumber: z.coerce.number().positive(),
})
const batchCurriculum = z.object({
  batchYear: z.coerce.number().min(2000).max(2100),
  curriculumEntries: z.array(curriculumEntry),
})

export const createProgramSchema = z.object({
  departmentId: z.coerce.number().positive(),
  discipline: z.enum(DISCIPLINES),
  degreeLevel: z.enum(DEGREE_LEVELS),

  programDirectorPublicId: z.uuidv7(),

  totalSemesters: z.coerce.number().positive().max(10),
  code: z.string().min(2).max(20), // db allows max 20 characters

  curriculums: z.array(batchCurriculum).min(1), // TODO: improve error response
}).superRefine((programData, ctx) => {

  // Validate each curriculum
  programData.curriculums.forEach((curr, currIdx) => {
    const entries = curr.curriculumEntries

    // Validate curriculum is provided for all semesters
    if (entries.length !== programData.totalSemesters) {
      ctx.addIssue({
        code: 'custom',
        path: ['curriculums', currIdx, 'curriculumEntries'],
        message: `Curriculum is required for all semesters (${programData.totalSemesters.toString()}), got ${entries.length.toString()} entries`,
      })
    }

    // validate all smesters are valid and unique
    const semesters = new Set<number>()
    entries.forEach((entry, entryIdx) => {
      if (entry.semesterNumber < 1 || entry.semesterNumber > programData.totalSemesters)
        ctx.addIssue({
          code: 'custom',
          path: ['curriculums', currIdx, 'curriculumEntries', entryIdx, 'semester'],
          message: `Semester must be between 1 and ${programData.totalSemesters.toString()}`,
        })
      if (semesters.has(entry.semesterNumber))
        ctx.addIssue({
          code: 'custom',
          path: ['curriculums', currIdx, 'curriculumEntries', entryIdx, 'semester'],
          message: 'Duplicate semester number in curriculum',
        })

      semesters.add(entry.semesterNumber)
    })
  })
})