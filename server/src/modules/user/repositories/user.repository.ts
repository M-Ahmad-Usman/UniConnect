import type { Kysely } from 'kysely'
import type { Database, InsertUserEntity, InsertUserTypeAssignmentEntity } from '../../../db/types.js'

export default class UserRepository {

  constructor(private readonly db: Kysely<Database>) { }

  async createUser(createUserDetails: InsertUserEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('users')
      .values(createUserDetails)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async assignType(typeAssignmentDetails: InsertUserTypeAssignmentEntity, trx: Kysely<Database> = this.db) {
    return await trx.insertInto('userTypeAssignments')
      .values(typeAssignmentDetails)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async getIdFromPublicId(publicId: string, trx: Kysely<Database> = this.db) {
    const usersRow = await trx.selectFrom('users')
      .select('id')
      .where('publicId', '=', publicId)
      .executeTakeFirst()

    return usersRow?.id
  }

}