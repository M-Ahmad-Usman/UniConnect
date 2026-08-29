import { db } from '../db/index.js'
import type {
  ServerEntity,
  InsertServerEntity,
  InsertUserEntity,
  InsertTeacherEntity,
  InsertDepartmentEntity,
  InsertClassEntity,
  InsertProgramEntity,
} from '../db/types.js'

const uniqueCounter = () => {
  let counter = 0
  return () => (counter++).toString()
}
const getUniqueCounter = uniqueCounter()

export const createDepartment = async (
  departmentOverrides: Partial<InsertDepartmentEntity> = {},
  departmentServerOverrides: Partial<InsertServerEntity> = {},
) => {

  let departmentServerEntity = {} as ServerEntity

  // skip department server creation if already provided
  if (!departmentServerOverrides.id) {
    const departmentServerTestData: InsertServerEntity = {
      name: `Test Server ${getUniqueCounter()}`,
      type: 'department',
    }

    departmentServerEntity = await db.insertInto('servers')
      .values({ ...departmentServerTestData, ...departmentServerOverrides })
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  const departmentTestData: InsertDepartmentEntity = {
    name: `Test Department ${getUniqueCounter()}`,
    code: `TD ${getUniqueCounter()}`,
    serverId: departmentServerEntity.id,
  }

  const departmentEntity = await db.insertInto('departments')
    .values({ ...departmentTestData, ...departmentOverrides })
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    ...departmentEntity,
    server: departmentServerEntity,
  }
}

export const createTeacher = async (
  userOverrides: Partial<InsertUserEntity> = {},
  teacherOverrides: Partial<InsertTeacherEntity> = {},
) => {

  const departmentId = teacherOverrides.departmentId ?? (await createDepartment()).id

  return await db.transaction().execute(async (trx) => {
    const userEntity = await trx.insertInto('users')
      .values({
        fullName: 'Test Teacher',
        personalEmail: `teacher.${getUniqueCounter()}@example.com`,
        universityEmail: `teacher.${getUniqueCounter()}@ntu.edu.pk`,
        phone: '0312-1234567',
        passwordHash: 'password123',
        gender: 'male',
        ...userOverrides,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    const teacherEntity = await trx.insertInto('teachers')
      .values({
        teacherId: userEntity.id,
        departmentId,
        designation: 'lecturer',
        ...teacherOverrides,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    await trx.insertInto('userTypeAssignments')
      .values({ userId: userEntity.id, type: 'teacher' })
      .execute()

    return { ...userEntity, ...teacherEntity }
  })
}

// Creates a full class: department (+ server) -> a teacher as program
// director -> program -> class (+ its own server). This mirrors the real
// dependency chain ClassService.createClass and
// ClassRepository.getStudentEnrollmentContext rely on.
export const createClass = async (classOverrides: Partial<InsertClassEntity> = {}) => {

  const departmentEntity = await createDepartment()
  const teacherEntity = await createTeacher({}, { departmentId: departmentEntity.id })

  const programEntity = await createProgram(
    {},
    { id: departmentEntity.id },
    { teacherId: teacherEntity.teacherId },
  )

  const classServerEntity = await db.insertInto('servers')
    .values({
      name: `Test Class Server ${getUniqueCounter()}`,
      type: 'class',
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  const classEntity = await db.insertInto('classes')
    .values({
      programId: programEntity.id,
      currentSemester: 1,
      section: 'A',
      academicYear: new Date().getFullYear(),
      admissionYear: new Date().getFullYear(),
      serverId: classServerEntity.id,
      ...classOverrides,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    ...classEntity,
    classServer: classServerEntity,
    programDirector: teacherEntity,
    department: departmentEntity,
    program: programEntity,
  }
}

export const createProgram = async (
  programOverrides: Partial<InsertProgramEntity> = {},
  departmentOverrides: Partial<InsertDepartmentEntity> = {},
  teacherOverrides: Partial<InsertUserEntity & InsertTeacherEntity> = {},
) => {

  const programDepartmentId = departmentOverrides.id ?? (await createDepartment()).id
  const programDirectorId = teacherOverrides.teacherId
    ?? teacherOverrides.id
    ?? (await createTeacher({}, { departmentId: programDepartmentId })).teacherId

  const programEntity = await db.insertInto('programs')
    .values({
      departmentId: programDepartmentId,
      discipline: 'computer_science',
      degreeLevel: 'bachelors',
      programDirectorId: programDirectorId,
      totalSemesters: 8,
      code: `BSCS${getUniqueCounter()}`,
      ...programOverrides,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return programEntity
}

// Utility Functions to generate test data

/* IMPORTANT: Make sure that the generated data shape represents the actual request dtos */

export const generateClass = (createClassRequest = {}) => {
  return {
    programId: 1,
    currentSemester: 1,
    section: 'A',
    academicYear: 2026,
    admissionYear: 2024,
    ...createClassRequest,
  }
}

export const generateTeacher = (createTeacherRequest = {}) => {
  return {
    fullName: 'Test Teacher',
    personalEmail: `teacher.${getUniqueCounter()}@example.com`,
    universityEmail: `teacher.${getUniqueCounter()}@ntu.edu.pk`,
    phone: '0312-1234567',
    password: 'password123',
    gender: 'male',
    designation: 'lecturer',
    departmentId: 1,
    ...createTeacherRequest,
  }
}

export const generateStudent = (createStudentRequest: Record<string, unknown> = {}) => {
  return {
    fullName: 'Test Student',
    personalEmail: `student.${getUniqueCounter()}@example.com`,
    universityEmail: `student.${getUniqueCounter()}@ntu.edu.pk`,
    phone: '0312-1234567',
    password: 'password123',
    gender: 'female',
    classPublicId: 'aaaaaaaa-aaaa-7aaa-aaaa-aaaaaaaaaaaa', // caller should override with a real class's publicId
    rollNumber: `TR-${getUniqueCounter()}`,
    ...createStudentRequest,
  }
}