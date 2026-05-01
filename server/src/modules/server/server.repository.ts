import type { Kysely } from 'kysely'
import type {
  Database,
  InsertServerEntity,
  InsertServerMembershipEntity,
} from '../../db/types.js'

export default class ServerRepository {

  constructor(private readonly db: Kysely<Database>) { }

  async createServer(createServerDetails: InsertServerEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('servers')
      .values(createServerDetails)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async addMember(membershipDetails: InsertServerMembershipEntity, trx: Kysely<Database> = this.db) {

    return await trx.insertInto('serverMemberships')
      .values(membershipDetails)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

}