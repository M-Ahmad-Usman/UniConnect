import type { z } from 'zod'
import type { BatchCurriculum } from './program.types.js'
import type { ProgramEntity,InsertProgramCurriculumEntity } from '../../db/types.js'
import type { createProgramSchema, createProgramCurriculaSchema } from './program.schema.js'

export type CreateProgramRequest = z.infer<typeof createProgramSchema>
export type CreateProgramCurriculaRequest = z.infer<typeof createProgramCurriculaSchema>

export interface CreateProgramResponse {
  id: number,
  departmentId: number,
  discipline: string,
  degreeLevel: string,
  directorPublicId: string,
  totalSemesters: number,
  code: string,
}

export type CreateProgramCurriculaResponse = BatchCurriculum[]

export const toCreateProgramResponse = (
  programEntity: ProgramEntity,
  directorPublicId: string,
): CreateProgramResponse => {
  return {
    id: programEntity.id,
    departmentId: programEntity.departmentId,
    discipline: programEntity.discipline,
    degreeLevel: programEntity.degreeLevel,
    directorPublicId,
    totalSemesters: programEntity.totalSemesters,
    code: programEntity.code,
  }
}

export const toCreateProgramCurriculaResponse = (
  createProgramCurricula: CreateProgramCurriculaRequest,
): CreateProgramCurriculaResponse => createProgramCurricula.curricula.map(curriculum => curriculum)

export function toProgramCurriculaInsert(
  curricula: BatchCurriculum[],
  programId: number,
): InsertProgramCurriculumEntity[] {

  const programCurriculaInsert: InsertProgramCurriculumEntity[] = []

  curricula.forEach(curriculum => {
    curriculum.semesterCourses.forEach(semesterCourses => {
      semesterCourses.courseIds.forEach(courseId => {
        programCurriculaInsert.push({
          programId: programId,
          batchYear: curriculum.batchYear,
          semesterNumber: semesterCourses.semesterNumber,
          courseId: courseId,
        })
      })
    })
  })

  return programCurriculaInsert
}