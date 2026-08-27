import type { Kysely } from 'kysely'
import type { Database, InsertClassEntity } from '../../db/types.js'
import type { IClassRepository } from './class.interface.js'

export default class ClassRepository implements IClassRepository {

  constructor(private readonly db: Kysely<Database>) { }

  async createClass(classInsert: InsertClassEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('classes')
      .values(classInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async findClassIdByClassPublicId(classPublicId: string, trx: Kysely<Database> = this.db): Promise<number | undefined> {
    const classesRow = await trx.selectFrom('classes')
      .select('classes.id')
      .where('classes.publicId', '=', classPublicId)
      .executeTakeFirst()

    return classesRow?.id
  }

  async findClassDepartmentServerIdByClassId(classId: number, trx: Kysely<Database> = this.db): Promise<number | undefined> {
    const classesProgramsJoinedRow = await trx.selectFrom('classes')
      .innerJoin('programs', 'programs.id', 'classes.programId')
      .innerJoin('departments', 'departments.id', 'programs.departmentId')
      .select('departments.serverId')
      .where('classes.id', '=', classId)
      .executeTakeFirst()

    return classesProgramsJoinedRow?.serverId
  }

  async findClassServerIdByClassId(classId: number, trx: Kysely<Database> = this.db): Promise<number | undefined> {
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
  async findStudentEnrollmentContextByClassPublicId(publicId: string, trx = this.db): Promise<{
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