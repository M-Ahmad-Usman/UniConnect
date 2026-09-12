import type { Kysely } from 'kysely'
import type {
  Database,
  ServerEntity,
  InsertServerEntity,
  ServerMembershipEntity,
  InsertServerMembershipEntity,
} from '../../db/types.js'

export interface IServerRepository {

  createServer(
    serverInsert: InsertServerEntity,
    trx?: Kysely<Database>,
  ): Promise<ServerEntity>,

  addMember(
    serverMembershipInsert: InsertServerMembershipEntity,
    trx?: Kysely<Database>,
  ): Promise<ServerMembershipEntity>

}