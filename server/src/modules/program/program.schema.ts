import { z } from 'zod'
import { DEGREE_LEVELS, DISCIPLINES } from '../../db/constants.js'

const courseSemesterAssignment = z.object({
  courseId: z.coerce.number().positive(),
  semesterNumber: z.coerce.number().positive(),
})
const batchCurriculum = z.object({
  batchYear: z.coerce.number().min(2000).max(2100),
  courseSemesterAssignments: z.array(courseSemesterAssignment),
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
  programData.curriculums.forEach((curriculum, currIdx) => {

    const { courseSemesterAssignments } = curriculum

    // Validate curriculum is provided for all semesters
    if (courseSemesterAssignments.length !== programData.totalSemesters) {
      ctx.addIssue({
        code: 'custom',
        path: ['curriculums', currIdx, 'courseSemesterAssignments'],
        message: `Curriculum is required for all (${programData.totalSemesters.toString()}) semesters, got ${courseSemesterAssignments.length.toString()} courseSemesterAssignment entries instead`,
      })
    }

    // validate all smesters are valid and unique
    const semesters = new Set<number>()
    courseSemesterAssignments.forEach((assignment, entryIdx) => {
      if (assignment.semesterNumber < 1 || assignment.semesterNumber > programData.totalSemesters)
        ctx.addIssue({
          code: 'custom',
          path: ['curriculums', currIdx, 'courseSemesterAssignments', entryIdx, 'semesterNumber'],
          message: `Semester must be between 1 and ${programData.totalSemesters.toString()} (max semester in the program)`,
        })
      if (semesters.has(assignment.semesterNumber))
        ctx.addIssue({
          code: 'custom',
          path: ['curriculums', currIdx, 'courseSemesterAssignments', entryIdx, 'semesterNumber'],
          message: 'Duplicate semester number in curriculum',
        })

      semesters.add(assignment.semesterNumber)
    })
  })
})