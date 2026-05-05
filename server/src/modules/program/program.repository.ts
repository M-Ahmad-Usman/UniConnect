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

  async getProgramDirectorIdFromPublicId(programDirectorPublicId: string, trx: Kysely<Database> = this.db) {
    const usersRow = await trx.selectFrom('users')
      .select('id')
      .where('publicId', '=', programDirectorPublicId)
      .executeTakeFirst()

    return usersRow?.id
  }

  /**
   * Takes curriculum entries for all semesters of a program.
   * Inserts the full curriculum of a program in the db
  **/
  async createProgramCurriculum(createProgramCurriculumDetails: InsertProgramCurriculumEntity[], trx: Kysely<Database> = this.db): Promise<InsertProgramCurriculumEntity[]> {
    return await trx.insertInto('programCurricula')
      .values(createProgramCurriculumDetails)
      .returningAll()
      .execute()
  }

  async getProgramDetails(programId: number, trx: Kysely<Database> = this.db) {
    return trx.selectFrom('programs')
      .selectAll()
      .where('id', '=', programId)
      .executeTakeFirst()
  }
}