import type { Kysely } from 'kysely'
import type { Database, InsertProgramCurriculumEntity, InsertProgramEntity } from '../../db/types.js'

export default class ProgramRepository {

  constructor(private readonly db: Kysely<Database>) {}

  async createProgram(createProgramDetails: InsertProgramEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('programs')
      .values(createProgramDetails)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async createProgramCurricula(createProgramCurriculumDetails: InsertProgramCurriculumEntity[], trx: Kysely<Database> = this.db) {
    await trx.insertInto('programCurricula')
      .values(createProgramCurriculumDetails)
      .execute()
  }

  async getProgramDetails(programId: number, trx: Kysely<Database> = this.db) {
    return trx.selectFrom('programs')
      .selectAll()
      .where('id', '=', programId)
      .executeTakeFirst()
  }
}