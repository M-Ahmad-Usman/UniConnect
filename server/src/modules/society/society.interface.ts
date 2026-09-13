import type { Kysely } from 'kysely'
import type { Database, SocietyEntity, InsertSocietyEntity } from '../../db/types.js'

export interface ISocietyRepository {

  createSociety(
    societyInsert: InsertSocietyEntity,
    trx?: Kysely<Database>,
  ): Promise<SocietyEntity>,

}