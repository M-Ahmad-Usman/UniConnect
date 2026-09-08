
// Database
import pg from 'pg'
import type { Kysely } from 'kysely'
import type { Database, InsertProgramEntity } from '../../db/types.js'

// DB Interfaces
import type { IProgramRepository } from './program.interface.js'
import type { IUserRepository } from '../user/user.interface.js'

// Errors
import type { FieldError } from '../../core/types/api.js'
import { BadRequestError, ConflictError, ValidationError } from '../../core/errors/AppError.js'

// DTO Types
import type {
  CreateProgramRequest,
  CreateProgramResponse,
  CreateProgramCurriculaRequest,
  CreateProgramCurriculaResponse,
} from './program.dto.js'

// DTO Mappers
import {
  toCreateProgramResponse,
  toCreateProgramCurriculaResponse,
  toProgramCurriculaInsert,
} from './program.dto.js'

export default class ProgramService {

  constructor(
    private readonly db: Kysely<Database>,
    private readonly programRepository: IProgramRepository,
    private readonly userRepository: IUserRepository,
  ) { }

  async createProgram(createProgramRequest: CreateProgramRequest): Promise<CreateProgramResponse> {
    try {
      return await this.db.transaction().execute(async trx => {

        const directorId = await this.userRepository
          .findIdByPublicId(createProgramRequest.directorPublicId)

        if (!directorId)
          throw new BadRequestError('Wrong or Invalid directorPublicId')

        const programInsert: InsertProgramEntity = {
          departmentId: createProgramRequest.departmentId,
          discipline: createProgramRequest.discipline,
          degreeLevel: createProgramRequest.degreeLevel,

          programDirectorId: directorId,

          totalSemesters: createProgramRequest.totalSemesters,
          code: createProgramRequest.code,
        }

        const programEntity = await this.programRepository.createProgram(programInsert, trx)

        return toCreateProgramResponse(programEntity, createProgramRequest.directorPublicId)
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
          case 'fk_programs_program_director_id':
            throw new BadRequestError('No teacher exists with specified programDirectorPublicId')
          case 'fk_programs_discipline':
            throw new BadRequestError('Wrong or Invalid discipline')

          // Unique constraints are defined in 2026-03-07T02-23-50.616Z_create_tables.ts file
          case 'uq_programs':
            throw new ConflictError('A program already exists with specified discipline, degreeLevel and departmentId')
          case 'uq_programs_code':
            throw new ConflictError('Provided program code is already in use')
        }
      }
      throw err
    }
  }

  async createProgramCurricula(createProgramCurriculaRequest: CreateProgramCurriculaRequest): Promise<CreateProgramCurriculaResponse> {
    try {
      return await this.db.transaction().execute(async trx => {

        const programTotalSemesters = await this.programRepository
          .findTotalSemestersById(createProgramCurriculaRequest.programId)

        if (programTotalSemesters === undefined)
          throw new BadRequestError('Wrong or Invalid programId')

        // Validate all curriculums are complete i.e specified for all semesters
        createProgramCurriculaRequest.curricula.forEach((curriculum, curriculumIdx) => {
          if (curriculum.semesterCourses.length !== programTotalSemesters) {
            const semesterCountValidationError: FieldError = {
              field: `curricula.${curriculumIdx.toString()}`,
              message: 'Curriculum must be specified for complete program i.e for all semesters',
              code: 'VALIDATION_ERROR',
            }
            throw new ValidationError([semesterCountValidationError])
          }
        })

        const programCurriculaInsert = toProgramCurriculaInsert(
          createProgramCurriculaRequest.curricula,
          createProgramCurriculaRequest.programId,
        )

        await this.programRepository.createProgramCurricula(programCurriculaInsert, trx)

        return toCreateProgramCurriculaResponse(createProgramCurriculaRequest)
      })
    }
    catch (err) {
      if (err instanceof pg.DatabaseError && err.constraint === 'fk_program_curricula_course_id')
        throw new BadRequestError('Wrong or Invalid courseId')
      throw err
    }
  }
}