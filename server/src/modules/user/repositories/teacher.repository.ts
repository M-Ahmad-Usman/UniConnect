import type { Kysely } from 'kysely'
import type { Database, InsertTeacherEntity } from '../../../db/types.js'


export default class TeacherRepository {

  constructor(private readonly db: Kysely<Database>) {}

  async createTeacher(teacherData: InsertTeacherEntity, trx: Kysely<Database> = this.db) {

    return await trx.insertInto('teachers')
      .values(teacherData)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

}