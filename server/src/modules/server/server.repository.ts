import type { Kysely } from 'kysely'
import type { Database, InsertServerMembershipEntity } from '../../db/types.js'

export default class ServerRepository {

  constructor(private readonly db: Kysely<Database>) { }

  async addMember(membershipDetails: InsertServerMembershipEntity, trx: Kysely<Database> = this.db) {

    return await trx.insertInto('serverMemberships')
      .values(membershipDetails)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async getDepartmentServerId(departmentId: number, trx: Kysely<Database> = this.db) {
    const departmentsRow = await trx.selectFrom('departments')
      .select('serverId')
      .where('id', '=', departmentId)
      .executeTakeFirst()

    return departmentsRow?.serverId
  }

}