import { db } from '../db/index.js'
import type { Kysely } from 'kysely'
import { Transaction } from 'kysely'
import type {
  Database,
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

export const createServer = async (
  options: { serverOverrides?: Partial<InsertServerEntity> } = {},
  client = db,
) => {
  return await client.insertInto('servers')
    .values({
      name: `Test Server ${getUniqueCounter()}`,
      type: 'department',
      ...options.serverOverrides,
    })
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const createDepartment = async (
  options: { departmentOverrides?: Partial<InsertDepartmentEntity> } = {},
  client = db,
) => {

  // Skip server creation if already provided
  const departmentServerId = options.departmentOverrides?.serverId
    ?? (await createServer({}, client)).id

  const departmentEntity = await client.insertInto('departments')
    .values({
      name: `Test Department ${getUniqueCounter()}`,
      code: `TD ${getUniqueCounter()}`,
      serverId: departmentServerId,
      ...options.departmentOverrides,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return departmentEntity
}

export const createTeacher = async (
  options: {
    userOverrides?: Partial<InsertUserEntity>,
    teacherOverrides?: Partial<InsertTeacherEntity>
  } = {},
  client = db,
) => {
  return runInTransaction(client, async trx => {

    const departmentId = options.teacherOverrides?.departmentId ?? (await createDepartment({}, trx)).id

    const userEntity = await trx.insertInto('users')
      .values({
        fullName: 'Test Teacher',
        personalEmail: `teacher.${getUniqueCounter()}@example.com`,
        universityEmail: `teacher.${getUniqueCounter()}@ntu.edu.pk`,
        phone: '0312-1234567',
        passwordHash: 'password123',
        gender: 'male',
        ...options.userOverrides,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    const teacherEntity = await trx.insertInto('teachers')
      .values({
        teacherId: userEntity.id,
        departmentId,
        designation: 'lecturer',
        ...options.teacherOverrides,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    await trx.insertInto('userTypeAssignments')
      .values({ userId: userEntity.id, type: 'teacher' })
      .execute()

    return { ...userEntity, ...teacherEntity }
  })
}

/** Creates a full class: department (+ server) -> a teacher as program
 * director -> program -> class (+ its own server). This mirrors the real
 * dependency chain.
**/
export const createClass = async (
  options: { classOverrides?: Partial<InsertClassEntity> } = {},
  client = db,
) => {
  return runInTransaction(client, async (trx) => {

    const departmentEntity = await createDepartment({}, trx)
    const teacherEntity = await createTeacher({ teacherOverrides: { departmentId: departmentEntity.id } }, trx)

    const programEntity = await createProgram({
      programOverrides: {
        departmentId: departmentEntity.id,
        programDirectorId: teacherEntity.id,
      },
    }, trx)

    const classServerEntity = await createServer({}, trx)

    const classEntity = await trx.insertInto('classes')
      .values({
        programId: programEntity.id,
        currentSemester: 1,
        section: 'A',
        academicYear: new Date().getFullYear(),
        admissionYear: new Date().getFullYear(),
        serverId: classServerEntity.id,
        ...options.classOverrides,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return classEntity
  })
}

export const createProgram = async (
  options: { programOverrides?: Partial<InsertProgramEntity> } = {},
  client = db,
) => {
  return await runInTransaction(client, async (trx) => {

    const departmentId = options.programOverrides?.departmentId
      ?? (await createDepartment({}, trx)).id
    const programDirectorId = options.programOverrides?.programDirectorId
      ?? (await createTeacher({}, trx)).id

    const programEntity = await trx.insertInto('programs')
      .values({
        departmentId,
        discipline: 'computer_science',
        degreeLevel: 'bachelors',
        programDirectorId,
        totalSemesters: 8,
        code: `BSCS${getUniqueCounter()}`,
        ...options.programOverrides,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return programEntity
  })
}

// Adaptive Transaction Wrapper Utility Function
export const runInTransaction = <T>(
  dbOrTrx: Kysely<Database> | Transaction<Database>,
  callback: (trx: Transaction<Database>) => Promise<T>,
): Promise<T> => {
  // If already inside a transaction, reuse it directly
  if (dbOrTrx instanceof Transaction) return callback(dbOrTrx)
  // Otherwise, start a new root transaction
  return dbOrTrx.transaction().execute(callback)
}

// Utility Functions to generate test data

/* IMPORTANT: Make sure that the generated data shape represents the actual request dtos */

export const generateDepartment = (departmentOverrides = {}) => {
  return {
    name: `Test Department ${getUniqueCounter()}`,
    code: `TD${getUniqueCounter()}`,
    server: {
      name: 'Test Server',
      description: 'Test Description',
      iconUrl: 'https://icon-url.com',
    },
    ...departmentOverrides,
  }
}

export const generateClass = (classOverrides = {}) => {
  return {
    programId: 1,
    currentSemester: 1,
    section: 'A',
    academicYear: 2026,
    admissionYear: 2024,
    ...classOverrides,
  }
}

export const generateTeacher = (teacherOverrides = {}) => {
  return {
    fullName: 'Test Teacher',
    personalEmail: `teacher.${getUniqueCounter()}@example.com`,
    universityEmail: `teacher.${getUniqueCounter()}@ntu.edu.pk`,
    phone: '0312-1234567',
    password: 'password123',
    gender: 'male',
    designation: 'lecturer',
    departmentId: 1,
    ...teacherOverrides,
  }
}

export const generateStudent = (studentOverrides = {}) => {
  return {
    fullName: 'Test Student',
    personalEmail: `student.${getUniqueCounter()}@example.com`,
    universityEmail: `student.${getUniqueCounter()}@ntu.edu.pk`,
    phone: '0312-1234567',
    password: 'password123',
    gender: 'female',
    classPublicId: 'aaaaaaaa-aaaa-7aaa-aaaa-aaaaaaaaaaaa', // caller should override with a real class's publicId
    rollNumber: `TR-${getUniqueCounter()}`,
    ...studentOverrides,
  }
}