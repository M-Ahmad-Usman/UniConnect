
import type { InsertProgramCurriculumEntity } from '../../db/types.js'
import type { BatchCurriculum } from './program.types.js'

export function processProgramCurriculaForDb(curriculums: BatchCurriculum[], programId: number): InsertProgramCurriculumEntity[] {

  const processedCurriculums: InsertProgramCurriculumEntity[] = []

  curriculums.forEach(curriculum => {
    curriculum.semesterCourses.forEach(semesterCourses => {
      semesterCourses.courseIds.forEach(courseId => {
        processedCurriculums.push({
          programId: programId,
          batchYear: curriculum.batchYear,
          semesterNumber: semesterCourses.semesterNumber,
          courseId: courseId,
        })
      })
    })
  })

  return processedCurriculums
}