import type { Kysely } from 'kysely'
import type { Database, InsertDepartmentEntity, InsertCourseEntity } from '../../db/types.js'
import type { IDepartmentRepository } from './department.interface.js'

export default class DepartmentRepository implements IDepartmentRepository {

  constructor(private readonly db: Kysely<Database>) {}

  async createDepartment(departmentInsert: InsertDepartmentEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('departments')
      .values(departmentInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async findDepartmentServerId(departmentId: number, trx: Kysely<Database> = this.db) {
    const departmentsRow = await trx.selectFrom('departments')
      .select('serverId')
      .where('id', '=', departmentId)
      .executeTakeFirst()

    return departmentsRow?.serverId
  }

  async createCourse(courseInsert: InsertCourseEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('courses')
      .values(courseInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }
}