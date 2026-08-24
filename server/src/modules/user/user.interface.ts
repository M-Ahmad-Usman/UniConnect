import type { Kysely } from 'kysely'
import type {
  Database,
  UserEntity,
  InsertUserEntity,
  StudentEntity,
  InsertStudentEntity,
  TeacherEntity,
  InsertTeacherEntity,
  UserTypeAssignmentEntity,
  InsertUserTypeAssignmentEntity,
} from '../../db/types.js'

export interface IUserRepository {
  createUser(
    userInsert: InsertUserEntity,
    trx?: Kysely<Database>
  ): Promise<UserEntity>,

  assignType(
    typeAssignmentInsert: InsertUserTypeAssignmentEntity,
    trx?: Kysely<Database>
  ): Promise<UserTypeAssignmentEntity>,

  findIdByPublicId(
    publicId: string,
    trx?: Kysely<Database>
  ): Promise<number | undefined>,

  createTeacher(
    teacherInsert: InsertTeacherEntity,
    trx?: Kysely<Database>
  ): Promise<TeacherEntity>,

  createStudent(
    studentInsert: InsertStudentEntity,
    trx?: Kysely<Database>
  ): Promise<StudentEntity>
}