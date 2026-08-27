import type { Kysely } from 'kysely'
import type {
  Database,
  ClassEntity,
  InsertClassEntity,
} from '../../db/types.js'

export interface IClassRepository {
  createClass(
    classInsert: InsertClassEntity,
    trx?: Kysely<Database>
  ): Promise<ClassEntity>,

  findClassIdByClassPublicId(
    classPublicId: string,
    trx?: Kysely<Database>
  ): Promise<number | undefined>,

  findClassDepartmentServerIdByClassId(
    classId: number,
    trx?: Kysely<Database>,
  ): Promise<number | undefined>

  findClassServerIdByClassId(
    classId: number,
    trx?: Kysely<Database>
  ): Promise<number | undefined>

  findStudentEnrollmentContextByClassPublicId(
    classPublicId: string,
    trx?: Kysely<Database>
  ): Promise<{
    classId: number,
    classServerId: number,
    departmentServerId: number
  } | undefined>,
}