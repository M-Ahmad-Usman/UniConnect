import type { Kysely } from 'kysely'
import type {
  Database,
  NewUser,
  NewTeacher,
  User,
  Teacher,
} from '../../db/types.js'

export default class UserRepository {
  constructor(private readonly db: Kysely<Database>) { }

  async createTeacher(
    fullUserDetails: NewUser,
    partialTeacherDetails: Omit<NewTeacher, 'teacherId'>,
  ): Promise<User & Teacher> {

    const completeTeacher = await this.db
      .transaction()
      .execute(async (trx) => {

        const newUser = await trx
          .insertInto('users')
          .values(fullUserDetails)
          .returningAll()
          .executeTakeFirstOrThrow()

        const fullTeacherDetails: NewTeacher = {
          ...partialTeacherDetails,
          teacherId: newUser.id,
        }

        const newTeacher = await trx
          .insertInto('teachers')
          .values(fullTeacherDetails)
          .returningAll()
          .executeTakeFirstOrThrow()

        return {
          ...newUser,
          ...newTeacher,
        }
      })

    return completeTeacher
  }
}