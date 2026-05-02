import type { Kysely } from 'kysely'
import type { Database } from '../../db/types.js'

export default class ProgramRepository {

  constructor(private readonly db: Kysely<Database>) {}

  async getProgramDetails(programId: number, trx: Kysely<Database> = this.db) {
    return trx.selectFrom('programs')
      .selectAll()
      .where('id', '=', programId)
      .executeTakeFirst()
  }
}