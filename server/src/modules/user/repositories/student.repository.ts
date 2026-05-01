
import type { Kysely } from 'kysely'
import type { Database, InsertStudentEntity } from '../../../db/types.js'

export default class StudentRepository {

  constructor(private readonly db: Kysely<Database>) {}

  async createStudent(createStudentDetails: InsertStudentEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('students')
      .values(createStudentDetails)
      .executeTakeFirstOrThrow()
  }

}