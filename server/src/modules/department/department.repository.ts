import type { Kysely } from 'kysely'
import type { Database, InsertDepartmentEntity } from '../../db/types.js'

export default class DepartmentRepository {

  constructor(private readonly db: Kysely<Database>) {}

  async createDepartment(departmentDetails: InsertDepartmentEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('departments')
      .values(departmentDetails)
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