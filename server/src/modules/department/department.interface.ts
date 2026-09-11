import type { Kysely } from 'kysely'
import type {
  Database,
  DepartmentEntity,
  InsertDepartmentEntity,
  CourseEntity,
  InsertCourseEntity,
} from '../../db/types.js'

export interface IDepartmentRepository {
  createDepartment(
    departmentInsert: InsertDepartmentEntity,
    trx?: Kysely<Database>
  ): Promise<DepartmentEntity>,

  findDepartmentServerId(
    departmentId: number,
    trx?: Kysely<Database>,
  ): Promise<number | undefined>

  createCourse(
    courseInsert: InsertCourseEntity,
    trx?: Kysely<Database>
  ): Promise<CourseEntity>
}