import type { Kysely } from 'kysely'
import type { ISocietyRepository } from './society.interface.js'
import type { Database, SocietyEntity, InsertSocietyEntity } from '../../db/types.js'

export default class SocietyRepository implements ISocietyRepository {

  constructor(private readonly db: Kysely<Database>) { }

  async createSociety(societyInsert: InsertSocietyEntity, trx: Kysely<Database> = this.db): Promise<SocietyEntity> {
    return await trx
      .insertInto('societies')
      .values(societyInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }
}