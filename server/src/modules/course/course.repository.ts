
import type { Kysely } from 'kysely'
import type { Database, InsertCourseEntity } from '../../db/types.js'

export default class CourseRepository {

  constructor(private readonly db: Kysely<Database>) {}

  async createCourse(createCourseDetails: InsertCourseEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('courses')
      .values(createCourseDetails)
      .returningAll()
      .executeTakeFirstOrThrow()
  }
}