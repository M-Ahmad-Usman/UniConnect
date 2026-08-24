import type { Kysely } from 'kysely'
import type { IUserRepository } from './user.interface.js'
import type {
  Database,
  UserEntity,
  InsertUserEntity,
  UserTypeAssignmentEntity,
  InsertUserTypeAssignmentEntity,
  TeacherEntity,
  InsertTeacherEntity,
  StudentEntity,
  InsertStudentEntity,
} from '../../db/types.js'

export default class UserRepository implements IUserRepository {

  constructor(private readonly db: Kysely<Database>) { }

  async createUser(userInsert: InsertUserEntity, trx: Kysely<Database> = this.db): Promise<UserEntity> {
    return await trx.insertInto('users')
      .values(userInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async assignType(typeAssignmentInsert: InsertUserTypeAssignmentEntity, trx: Kysely<Database> = this.db): Promise<UserTypeAssignmentEntity> {
    return await trx.insertInto('userTypeAssignments')
      .values(typeAssignmentInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async findIdByPublicId(publicId: string, trx: Kysely<Database> = this.db): Promise<number | undefined> {
    const usersRow = await trx.selectFrom('users')
      .select('id')
      .where('publicId', '=', publicId)
      .executeTakeFirst()

    return usersRow?.id
  }

  async createTeacher(teacherInsert: InsertTeacherEntity, trx: Kysely<Database> = this.db): Promise<TeacherEntity> {
    return await trx.insertInto('teachers')
      .values(teacherInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async createStudent(studentInsert: InsertStudentEntity, trx: Kysely<Database> = this.db): Promise<StudentEntity> {
    return await trx.insertInto('students')
      .values(studentInsert)
      .returningAll()
      .executeTakeFirstOrThrow()
  }
}