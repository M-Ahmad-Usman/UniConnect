import type { Kysely } from 'kysely'
import type {
  Database,
  InsertServerEntity,
  InsertServerMembershipEntity,
} from '../../db/types.js'

export default class ServerRepository {

  constructor(private readonly db: Kysely<Database>) { }

  async createServer(serverDetails: InsertServerEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('servers')
      .values(serverDetails)
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