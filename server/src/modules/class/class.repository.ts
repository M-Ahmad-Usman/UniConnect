import type { Kysely } from 'kysely'
import type { Database, InsertClassEntity } from '../../db/types.js'

export default class ClassRepository {

  constructor(private readonly db: Kysely<Database>) { }

  async createClass(createClassDetails: InsertClassEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('classes')
      .values(createClassDetails)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async getIdFromPublicId(publicId: string, trx: Kysely<Database> = this.db): Promise<number | undefined> {
    const classesRow = await trx.selectFrom('classes')
      .select('classes.id')
      .where('classes.publicId', '=', publicId)
      .executeTakeFirst()

    return classesRow?.id
  }

  /**
   * Returns the id (serverId) of the class's department's server
  **/
  async getClassDepartmentServerId(classId: number, trx: Kysely<Database> = this.db): Promise<number | undefined> {
    const classesProgramsJoinedRow = await trx.selectFrom('classes')
      .innerJoin('programs', 'programs.id', 'classes.programId')
      .innerJoin('departments', 'departments.id', 'programs.departmentId')
      .select('departments.serverId')
      .where('classes.id', '=', classId)
      .executeTakeFirst()

    return classesProgramsJoinedRow?.serverId
  }

  async getClassServerId(classId: number, trx: Kysely<Database> = this.db): Promise<number | undefined> {
    const classesRow = await trx.selectFrom('classes')
      .select('serverId')
      .where('id', '=', classId)
      .executeTakeFirst()

    return classesRow?.serverId
  }

  /**
   * Returns necessary data required for enrolling a new student
   * Returns
   * - class's id as classId
   * - class's serverId as classServerId,
   * - class's department's serverId as departmentServerId (serverId of department to which the class belongs)
   */
  async getStudentEnrollmentContext(publicId: string, trx = this.db): Promise<{
    classId: number,
    classServerId: number,
    departmentServerId: number,
  } | undefined> {
    return trx
      .selectFrom('classes')
      .innerJoin('programs', 'programs.id', 'classes.programId')
      .innerJoin('departments', 'departments.id', 'programs.departmentId')
      .select([
        'classes.id as classId',
        'classes.serverId as classServerId',
        'departments.serverId as departmentServerId',
      ])
      .where('classes.publicId', '=', publicId)
      .executeTakeFirst()
  }
}