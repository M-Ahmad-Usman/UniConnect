import type { Kysely } from 'kysely'
import type { IServerRepository } from './server.interface.js'
import type {
  Database,
  InsertServerEntity,
  InsertServerMembershipEntity,
} from '../../db/types.js'

export default class ServerRepository implements IServerRepository {

  constructor(private readonly db: Kysely<Database>) { }

  async createServer(serverInsert: InsertServerEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('servers')
      .values(serverInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async addMember(serverMembershipInsert: InsertServerMembershipEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('serverMemberships')
      .values(serverMembershipInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

}