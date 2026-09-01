import type { Kysely } from 'kysely'
import type { Database, InsertProgramCurriculumEntity, InsertProgramEntity } from '../../db/types.js'
import type { IProgramRepository } from './program.interface.js'

export default class ProgramRepository implements IProgramRepository {

  constructor(private readonly db: Kysely<Database>) {}

  async createProgram(programInsert: InsertProgramEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('programs')
      .values(programInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async createProgramCurricula(programCurriculaInsert: InsertProgramCurriculumEntity[], trx: Kysely<Database> = this.db) {
    return await trx.insertInto('programCurricula')
      .returningAll()
      .values(programCurriculaInsert)
      .execute()
  }

  async findProgramById(id: number, trx: Kysely<Database> = this.db) {
    return await trx.selectFrom('programs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
  }

  async findTotalSemestersById(id: number, trx: Kysely<Database> = this.db) {
    const program = await trx.selectFrom('programs')
      .select('totalSemesters')
      .where('id', '=', id)
      .executeTakeFirst()

    return program?.totalSemesters
  }
}