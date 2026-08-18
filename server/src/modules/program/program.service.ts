
// Database
import pg from 'pg'
import type { Kysely } from 'kysely'
import type { Database, InsertProgramEntity } from '../../db/types.js'

// Repositories
import type ProgramRepository from './program.repository.js'
import type UserRepository from '../user/user.repository.js'

// Errors
import { BadRequestError, ConflictError } from '../../core/errors/AppError.js'

// Utils
import { processProgramCurriculaForDb } from './program.utils.js'

// Types
import type { CreateProgram } from './program.types.js'

export default class ProgramService {

  constructor(
    private readonly db: Kysely<Database>,
    private readonly programRepository: ProgramRepository,
    private readonly userRepository: UserRepository,
  ) { }

  async createProgram(createProgramData: CreateProgram) {

    const programDirectorId = await this.userRepository
      .getIdFromPublicId(createProgramData.programDirectorPublicId)

    if (!programDirectorId)
      throw new BadRequestError('Wrong or Invalid Program Director Public Id')

    try {
      return await this.db.transaction().execute(async trx => {

        const createProgramInfo: InsertProgramEntity = {
          departmentId: createProgramData.departmentId,
          discipline: createProgramData.discipline,
          degreeLevel: createProgramData.degreeLevel,

          programDirectorId: programDirectorId,

          totalSemesters: createProgramData.totalSemesters,
          code: createProgramData.code,
        }
        const createdProgramInfo = await this.programRepository.createProgram(createProgramInfo, trx)

        const createProgramCurriculaInfo = processProgramCurriculaForDb(createProgramData.curriculums, createdProgramInfo.id)

        await this.programRepository.createProgramCurricula(createProgramCurriculaInfo, trx)

        const newProgram = {
          id: createdProgramInfo.id,
          departmentId: createdProgramInfo.departmentId,
          discipline: createdProgramInfo.discipline,
          degreeLevel: createdProgramInfo.degreeLevel,

          programDirectorPublicId: createProgramData.programDirectorPublicId,

          totalSemesters: createdProgramInfo.totalSemesters,
          code: createdProgramInfo.code,

          curriculums: createProgramData.curriculums,
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
          case 'fk_programs_program_director_id':
            throw new BadRequestError('No teacher exists with specified programDirectorPublicId')

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

}