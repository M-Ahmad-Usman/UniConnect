
// Database
import pg from 'pg'
import type { Kysely } from 'kysely'
import type { Database } from '../../db/types.js'
import type UserRepository from './repositories/user.repository.js'
import type TeacherRepository from './repositories/teacher.repository.js'
import type StudentRepository from './repositories/student.repository.js'
import type ServerRepository from '../server/server.repository.js'
import type {
  InsertUserEntity,
  InsertTeacherEntity,
  InsertServerMembershipEntity,
  InsertUserTypeAssignmentEntity,
} from '../../db/types.js'

// Validation and Errors
import type z from 'zod'
import type { teacherCreateSchema } from './user.schema.js'
import { BadRequestError, ConflictError } from '../../core/errors/AppError.js'

// Utils
import * as passwordUtil from '../../core/utils/password.js'

export default class UserService {

  constructor(
    private readonly db: Kysely<Database>, // use for creating transactions only
    private readonly userRepository: UserRepository,
    private readonly teacherRepository: TeacherRepository,
    private readonly studentRepository: StudentRepository,
    private readonly serverRepository: ServerRepository,
  ) { }

  async createTeacher(teacherData: z.infer<typeof teacherCreateSchema>) {

    const passwordHash = await passwordUtil.hash(teacherData.password)
    // required for insertion in server_memberships
    const departmentServerId = await this.serverRepository.getDepartmentServerId(teacherData.departmentId)
    if (!departmentServerId)
      throw new BadRequestError('Wrong or Invalid departmentId for teacher.')

    try {
      return await this.db.transaction().execute(async trx => {

        // Insert into users first to get the generated id for teacher
        const userDetails: InsertUserEntity = {
          fullName: teacherData.fullName,
          personalEmail: teacherData.personalEmail,
          universityEmail: teacherData.universityEmail ?? null,
          phone: teacherData.phone,
          passwordHash: passwordHash,

          gender: teacherData.gender,
          profilePictureUrl: teacherData.profilePictureUrl ?? null,
          bio: teacherData.bio ?? null,
        }
        const rawNewUser = await this.userRepository.createUser(userDetails, trx)

        // Prepare rest of the data for insertion
        const teacherDetails: InsertTeacherEntity = {
          teacherId: rawNewUser.id,
          departmentId: teacherData.departmentId,
          designation: teacherData.designation,
        }
        const userTypeAssignmentDetails: InsertUserTypeAssignmentEntity = {
          userId: rawNewUser.id,
          type: 'teacher',
        }
        const serverMembershipDetails: InsertServerMembershipEntity = {
          userId: rawNewUser.id,
          serverId: departmentServerId,
        }

        // Insert rest of the data
        const [rawNewTeacher, ..._temp] = await Promise.all([
          this.teacherRepository.createTeacher(teacherDetails, trx),
          this.serverRepository.addMember(serverMembershipDetails, trx),
          this.userRepository.assignType(userTypeAssignmentDetails, trx),
        ])

        const newTeacher = {
          publicId: rawNewUser.publicId,
          fullName: rawNewUser.fullName,
          personalEmail: rawNewUser.personalEmail,
          universityEmail: rawNewUser.universityEmail ?? null,
          phone: rawNewUser.phone,

          gender: rawNewUser.gender,
          profilePictureUrl: rawNewUser.profilePictureUrl ?? null,
          bio: rawNewUser.bio ?? null,

          designation: rawNewTeacher.designation,
          departmentId: rawNewTeacher.departmentId,
        }
        return newTeacher
      })
    }
    // Enrich known and expected DB Errors
    catch (err: unknown) {
      if (err instanceof pg.DatabaseError) {
        // constraint names are defined in src/db/migrations/2026-03-07T02-23-50.616Z_create_tables.ts
        switch (err.constraint) {
          case 'uq_users_personal_email':
            throw new ConflictError('Specified personal email is already registered.')
          case 'uidx_users_active_university_email':
            throw new ConflictError('Specified university email is already in use.')
          case 'fk_teachers_department_id':
            throw new BadRequestError('Wrong or Invalid departmentId for teacher.')
        }
      }
      throw err
    }
  }
}