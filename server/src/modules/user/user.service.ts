
// Database
import pg from 'pg'
import type { Kysely } from 'kysely'
import type {
  Database,
  InsertUserEntity,
  InsertTeacherEntity,
  InsertStudentEntity,
  InsertServerMembershipEntity,
  InsertUserTypeAssignmentEntity,
} from '../../db/types.js'

// Repositories
import type UserRepository from './user.repository.js'
import type ServerRepository from '../server/server.repository.js'
import type ClassRepository from '../class/class.repository.js'
import type DepartmentRepository from '../department/department.repository.js'

// Errors
import { BadRequestError, ConflictError } from '../../core/errors/AppError.js'

// Utils
import * as passwordUtil from '../../core/utils/password.js'
import { toStudentResponse, toTeacherResponse } from './user.dto.js'

// Types
import type {
  StudentResponse,
  CreateStudentRequest,
  TeacherResponse,
  CreateTeacherRequest,
} from './user.dto.ts'

export default class UserService {

  constructor(
    private readonly db: Kysely<Database>, // use for creating transactions only
    private readonly userRepository: UserRepository,
    private readonly serverRepository: ServerRepository,
    private readonly classRepository: ClassRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) { }

  async createTeacher(createTeacherRequest: CreateTeacherRequest): Promise<TeacherResponse> {

    const passwordHash = await passwordUtil.hash(createTeacherRequest.password)

    const teacherDepartmentServerId = await this.departmentRepository
      .getDepartmentServerId(createTeacherRequest.departmentId)

    if (!teacherDepartmentServerId)
      throw new BadRequestError('Wrong or Invalid departmentId for teacher.')

    try {
      return await this.db.transaction().execute(async trx => {

        // Insert into users first to get the generated id for teacher
        const userInsert: InsertUserEntity = {
          fullName: createTeacherRequest.fullName,
          personalEmail: createTeacherRequest.personalEmail,
          universityEmail: createTeacherRequest.universityEmail ?? null,
          phone: createTeacherRequest.phone,
          passwordHash,

          gender: createTeacherRequest.gender,
          profilePictureUrl: createTeacherRequest.profilePictureUrl ?? null,
          bio: createTeacherRequest.bio ?? null,
        }
        const userEntity = await this.userRepository.createUser(userInsert, trx)

        const teacherInsert: InsertTeacherEntity = {
          teacherId: userEntity.id,
          departmentId: createTeacherRequest.departmentId,
          designation: createTeacherRequest.designation,
        }
        const teacherEntity = await this.userRepository.createTeacher(teacherInsert, trx)

        const userTypeAssignmentInsert: InsertUserTypeAssignmentEntity = {
          userId: userEntity.id,
          type: 'teacher',
        }
        await this.userRepository.assignType(userTypeAssignmentInsert, trx)

        const serverMembershipInsert: InsertServerMembershipEntity = {
          userId: userEntity.id,
          serverId: teacherDepartmentServerId,
        }
        await this.serverRepository.addMember(serverMembershipInsert, trx)

        return toTeacherResponse(userEntity, teacherEntity)
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

  async createStudent(createStudentRequest: CreateStudentRequest): Promise<StudentResponse> {

    const passwordHash = await passwordUtil.hash(createStudentRequest.password)

    const studentEnrollmentContext = await this.classRepository
      .getStudentEnrollmentContext(createStudentRequest.classPublicId)

    if (!studentEnrollmentContext)
      throw new BadRequestError("Wrong or Invalid publicId for student's class")

    const {
      classId: studentClassId,
      classServerId: studentClassServerId,
      departmentServerId: studentDepartmentServerId,
    } = studentEnrollmentContext

    try {
      return await this.db.transaction().execute(async trx => {

        const userInsert: InsertUserEntity = {
          fullName: createStudentRequest.fullName,
          personalEmail: createStudentRequest.personalEmail,
          universityEmail: createStudentRequest.universityEmail ?? null,
          phone: createStudentRequest.phone,
          passwordHash: passwordHash,

          gender: createStudentRequest.gender,
          profilePictureUrl: createStudentRequest.profilePictureUrl ?? null,
          bio: createStudentRequest.bio ?? null,
        }
        const userEntity = await this.userRepository.createUser(userInsert, trx)

        const studentInsert: InsertStudentEntity = {
          studentId: userEntity.id,
          classId: studentClassId,
          rollNumber: createStudentRequest.rollNumber,
        }
        const studentEntity = await this.userRepository.createStudent(studentInsert, trx)

        const userTypeAssignmentInsert: InsertUserTypeAssignmentEntity = {
          userId: userEntity.id,
          type: 'student',
        }
        await this.userRepository.assignType(userTypeAssignmentInsert, trx)

        const classServerMembershipInsert: InsertServerMembershipEntity = {
          userId: userEntity.id,
          serverId: studentClassServerId,
        }
        await this.serverRepository.addMember(classServerMembershipInsert, trx)

        const departmentServerMembershipInsert: InsertServerMembershipEntity = {
          userId: userEntity.id,
          serverId: studentDepartmentServerId,
        }
        await this.serverRepository.addMember(departmentServerMembershipInsert, trx)

        return toStudentResponse(userEntity, studentEntity, createStudentRequest.classPublicId)
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
        }
      }
      throw err
    }
  }
}