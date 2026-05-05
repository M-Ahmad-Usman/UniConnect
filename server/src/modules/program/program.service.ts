
// Database
import pg from 'pg'
import type { Kysely } from 'kysely'
import type {
  Database,
  InsertProgramCurriculumEntity,
  InsertProgramEntity,
} from '../../db/types.js'

// Repositories
import type ProgramRepository from './program.repository.js'

// Errors
import { BadRequestError, ConflictError } from '../../core/errors/AppError.js'

// Utils

// Types
import type { CreateProgram } from './program.types.js'

export default class ProgramService {

  constructor(
    private readonly db: Kysely<Database>,
    private readonly programRepository: ProgramRepository,
  ) { }

  async createProgram(createProgramData: CreateProgram) {

    const programDirectorId = await this.programRepository
      .getProgramDirectorIdFromPublicId(createProgramData.programDirectorPublicId)

    if (!programDirectorId)
      throw new BadRequestError('Wrong or Invalid Program Director Public Id')

    try {
      return await this.db.transaction().execute(async trx => {

        const createProgramInfo: InsertProgramEntity = {
          departmentId: createProgramData.departmentId, // can throw foreign key error if departmentId is wrong
          discipline: createProgramData.discipline,
          degreeLevel: createProgramData.degreeLevel,

          programDirectorId: programDirectorId, // foreign key error already handled above

          totalSemesters: createProgramData.totalSemesters,
          code: createProgramData.code, // can throw unique constraint error if code is duplicate
        }
        const createdProgramInfo = await this.programRepository
          .createProgram(createProgramInfo, trx)

        const programCurriculaInfoAllBatches: InsertProgramCurriculumEntity[][] = createProgramData.curriculums.map(curriculum => {
          const singleBatchCurriculum: InsertProgramCurriculumEntity[] = curriculum.courseSemesterAssignments.map(courseSemesterAssignment => {
            return {
              programId: createdProgramInfo.id,
              courseId: courseSemesterAssignment.courseId, // can throw foreign key error if courseId is wrong
              semesterNumber: courseSemesterAssignment.semesterNumber,
              batchYear: curriculum.batchYear,
            }
          })
          return singleBatchCurriculum
        })

        const createProgramCurriculumInfoPerBatchPromise = programCurriculaInfoAllBatches
          .map(singleBatchCurriculum => this.programRepository.createProgramCurriculum(singleBatchCurriculum, trx))

        const createdProgramCurriculumsAllBatches = await Promise.all(createProgramCurriculumInfoPerBatchPromise)

        const curriculums = createdProgramCurriculumsAllBatches.map(curriculum => {
          return {
            batchYear: curriculum[0]?.batchYear,
            courseSemesterAssignments: curriculum.map(entry => ({ courseId: entry.courseId, semester: entry.semesterNumber })),
          }
        })

        const newProgram = {
          id: createdProgramInfo.id,
          departmentId: createdProgramInfo.departmentId,
          discipline: createdProgramInfo.discipline,
          degreeLevel: createdProgramInfo.degreeLevel,

          programDirectorPublicId: createProgramData.programDirectorPublicId,

          totalSemesters: createdProgramInfo.totalSemesters,
          code: createdProgramInfo.code,

          curriculums: curriculums,
        }

        return newProgram
      })
    }
    catch (err: unknown) {
      // Enrich known and expected DB Errors
      if (err instanceof pg.DatabaseError) {
        switch (err.constraint) {

          // foreign key constraints are defined in 2026-03-07T20-49-09.308Z_define_foreign_keys.ts file
          case 'fk_programs_department_id':
            throw new BadRequestError('Wrong or Invalid departmentId')
          case 'fk_program_curricula_course_id':
            throw new BadRequestError('Wrong or Invalid courseId')

          // Unique constraints are defined in 2026-03-07T02-23-50.616Z_create_tables.ts file
          case 'uq_programs_code':
            throw new ConflictError('Provided program code is already in use')
          case 'uq_program_curricula':
            throw new BadRequestError('Possible Errors: 1. Duplicate course assignmnent for a batch. A course can only taught once per program per batch. 2. Two curriculums are provided for same batch (duplicate batchYear)')
        }
      }
      throw err
    }

  }

}