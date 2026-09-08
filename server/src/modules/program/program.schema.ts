import { z } from 'zod'

import { DEGREE_LEVELS } from '../../db/constants.js'
import { programsVarcharSizes } from '../../db/constants.js'

export const createProgramSchema = z.object({
  departmentId: z.coerce.number().positive(),
  discipline: z.string().max(programsVarcharSizes.discipline),
  degreeLevel: z.enum(DEGREE_LEVELS),

  directorPublicId: z.uuidv7(),

  totalSemesters: z.coerce.number().positive().max(10),
  code: z.string().min(2).max(programsVarcharSizes.code),
})

const courseAssignmentsPerSemester = z.object({
  semesterNumber: z.coerce.number().min(1),
  courseIds: z.array(z.coerce.number()).min(1),
})

export const batchCurriculum = z.object({
  batchYear: z.coerce.number().min(2000).max(2100),
  semesterCourses: z.array(courseAssignmentsPerSemester),
})

export const createProgramCurriculaSchema = z.object({
  programId: z.number(),
  curricula: z.array(batchCurriculum).min(1, 'Atleast 1 curriculum is required'), // TODO: improve error response
}).superRefine(({ curricula }, ctx) => {

  /**
   * Validate following in each curriculum
   * 1. batchYear is unique for each curriculum
   * 2. all courses are unique within each curriculum
   * 3. no duplicate semester number within each curriculum
  */

  const batches = new Set<number>()
  curricula.forEach((curriculum, curriculumIdx) => {

    // 1. no duplicate batchYear between curriculums
    if (batches.has(curriculum.batchYear))
      ctx.addIssue({
        code: 'custom',
        path: ['curricula', curriculumIdx, 'batchYear'],
        message: 'Duplicate batchYear. batchYear must be unique for each curriculum',
      })

    batches.add(curriculum.batchYear)

    const courseIds = new Set<number>()
    const semesters = new Set<number>()

    curriculum.semesterCourses.forEach((semesterCourses, semesterCoursesIdx) => {

      // 2. Validate all courses are unique within a curriculum
      semesterCourses.courseIds.forEach((courseId, courseIdIdx) => {
        if (courseIds.has(courseId))
          ctx.addIssue({
            code: 'custom',
            path: ['curricula', curriculumIdx, 'semesterCourses', semesterCoursesIdx, 'courseIds', courseIdIdx],
            message: 'Duplicate course assignment. All course assignments must be unique within a batch',
          })
        courseIds.add(courseId)
      })

      // 3. validate semester number is not duplicated within a curriculum
      if (semesters.has(semesterCourses.semesterNumber)) {
        ctx.addIssue({
          code: 'custom',
          path: ['curricula', curriculumIdx, 'semesterCourses', semesterCoursesIdx, 'semesterNumber'],
          message: 'Duplicate semesterNumber. Semester numbers must be unique within a curriculum',
        })
      }

      semesters.add(semesterCourses.semesterNumber)
    })
  })
})