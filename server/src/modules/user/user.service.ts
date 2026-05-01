
// Database
import pg from 'pg'
import type { Kysely } from 'kysely'

// Repositories
import type UserRepository from './repositories/user.repository.js'
import type TeacherRepository from './repositories/teacher.repository.js'
import type StudentRepository from './repositories/student.repository.js'
import type ServerRepository from '../server/server.repository.js'
import type ClassRepository from '../class/class.repository.js'

// Errors
import { BadRequestError, ConflictError } from '../../core/errors/AppError.js'

// Utils
import * as passwordUtil from '../../core/utils/password.js'

// Data Types
import type { CreateTeacher, CreateStudent } from './user.types.js'
import type {
  Database,
  InsertUserEntity,
  InsertTeacherEntity,
  InsertStudentEntity,
  InsertServerMembershipEntity,
  InsertUserTypeAssignmentEntity,
} from '../../db/types.js'

export default class UserService {

  constructor(
    private readonly db: Kysely<Database>, // use for creating transactions only
    private readonly userRepository: UserRepository,
    private readonly teacherRepository: TeacherRepository,
    private readonly studentRepository: StudentRepository,
    private readonly serverRepository: ServerRepository,
    private readonly classRepository: ClassRepository,
  ) { }

  async createTeacher(createTeacherData: CreateTeacher) {

    const passwordHash = await passwordUtil.hash(createTeacherData.password)

    const teacherDepartmentServerId = await this.serverRepository
      .getDepartmentServerId(createTeacherData.departmentId)

    if (!teacherDepartmentServerId)
      throw new BadRequestError('Wrong or Invalid departmentId for teacher.')

    try {
      return await this.db.transaction().execute(async trx => {

        // Insert into users first to get the generated id for teacher
        const createUserInfo: InsertUserEntity = {
          fullName: createTeacherData.fullName,
          personalEmail: createTeacherData.personalEmail,
          universityEmail: createTeacherData.universityEmail ?? null,
          phone: createTeacherData.phone,
          passwordHash: passwordHash,

          gender: createTeacherData.gender,
          profilePictureUrl: createTeacherData.profilePictureUrl ?? null,
          bio: createTeacherData.bio ?? null,
        }
        const rawNewUserData = await this.userRepository.createUser(createUserInfo, trx)

        // Prepare rest of the data for insertion
        const createTeacherInfo: InsertTeacherEntity = {
          teacherId: rawNewUserData.id,
          departmentId: createTeacherData.departmentId,
          designation: createTeacherData.designation,
        }
        const userTypeAssignmentInfo: InsertUserTypeAssignmentEntity = {
          userId: rawNewUserData.id,
          type: 'teacher',
        }
        const serverMembershipInfo: InsertServerMembershipEntity = {
          userId: rawNewUserData.id,
          serverId: teacherDepartmentServerId,
        }

        // Insert rest of the data
        const [rawNewTeacherData] = await Promise.all([
          this.teacherRepository.createTeacher(createTeacherInfo, trx),
          this.serverRepository.addMember(serverMembershipInfo, trx),
          this.userRepository.assignType(userTypeAssignmentInfo, trx),
        ])

        const newTeacher = {
          publicId: rawNewUserData.publicId,
          fullName: rawNewUserData.fullName,
          personalEmail: rawNewUserData.personalEmail,
          universityEmail: rawNewUserData.universityEmail ?? null,
          phone: rawNewUserData.phone,

          gender: rawNewUserData.gender,
          profilePictureUrl: rawNewUserData.profilePictureUrl ?? null,
          bio: rawNewUserData.bio ?? null,

          designation: rawNewTeacherData.designation,
          departmentId: rawNewTeacherData.departmentId,
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

  async createStudent(createStudentData: CreateStudent) {

    const passwordHash = await passwordUtil.hash(createStudentData.password)

    const studentEnrollmentContext = await this.classRepository
      .getStudentEnrollmentContext(createStudentData.classPublicId)

    if (!studentEnrollmentContext)
      throw new BadRequestError("Wrong or Invalid publicId for student's class")

    const { classId, classServerId, departmentServerId } = studentEnrollmentContext

    try {
      return await this.db.transaction().execute(async trx => {

        const createUserInfo: InsertUserEntity = {
          fullName: createStudentData.fullName,
          personalEmail: createStudentData.personalEmail,
          universityEmail: createStudentData.universityEmail ?? null,
          phone: createStudentData.phone,
          passwordHash: passwordHash,

          gender: createStudentData.gender,
          profilePictureUrl: createStudentData.profilePictureUrl ?? null,
          bio: createStudentData.bio ?? null,
        }
        const rawNewUserData = await this.userRepository.createUser(createUserInfo, trx)

        // Prepare rest of the data for insertion
        const createStudentInfo: InsertStudentEntity = {
          studentId: rawNewUserData.id,
          classId: classId,
          rollNumber: createStudentData.rollNumber,
        }
        const userTypeAssignmentInfo: InsertUserTypeAssignmentEntity = {
          userId: rawNewUserData.id,
          type: 'student',
        }
        const classServerMembershipInfo: InsertServerMembershipEntity = {
          userId: rawNewUserData.id,
          serverId: classServerId,
        }
        const departmentServerMembershipInfo: InsertServerMembershipEntity = {
          userId: rawNewUserData.id,
          serverId: departmentServerId,
        }

        // Insert rest of the data
        await Promise.all([
          this.studentRepository.createStudent(createStudentInfo, trx),
          this.serverRepository.addMember(classServerMembershipInfo, trx),
          this.serverRepository.addMember(departmentServerMembershipInfo, trx),
          this.userRepository.assignType(userTypeAssignmentInfo, trx),
        ])

        const newStudent = {
          publicId: rawNewUserData.publicId,
          fullName: rawNewUserData.fullName,
          personalEmail: rawNewUserData.personalEmail,
          universityEmail: rawNewUserData.universityEmail ?? null,
          phone: rawNewUserData.phone,

          gender: rawNewUserData.gender,
          profilePictureUrl: rawNewUserData.profilePictureUrl ?? null,
          bio: rawNewUserData.bio ?? null,

          rollNumber: createStudentData.rollNumber,
          classPublicId: createStudentData.classPublicId,
        }
        return newStudent
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