
// Database
import pg from 'pg'
import type { Kysely } from 'kysely'
import type {
  Database,
  InsertDepartmentEntity,
  InsertServerEntity,
} from '../../db/types.js'


// DB Interface
import type { IDepartmentRepository } from './department.interface.js'
import type { IServerRepository } from '../server/server.interface.js'

// Errors
import { BadRequestError } from '../../core/errors/AppError.js'

// DTO Types
import type {
  CreateDepartmentRequest,
  CreateDepartmentResponse,
  CreateCourseRequest,
  CreateCourseResponse,
} from './department.dto.js'

// DTO Mappers
import { toCreateDepartmentResponse, toCreateCourseResponse } from './department.dto.js'

export default class DepartmentService {

  constructor(
    private readonly db: Kysely<Database>, // use for creating transactions only
    private readonly departmentRepository: IDepartmentRepository,
    private readonly serverRepository: IServerRepository,
  ) { }

  async createDepartment(createDepartmentRequest: CreateDepartmentRequest): Promise<CreateDepartmentResponse> {

    return await this.db.transaction().execute(async trx => {

      // Create Department Server
      const departmentServerInsert: InsertServerEntity = {
        name: createDepartmentRequest.server.name,
        description: createDepartmentRequest.server.description ?? null,
        iconUrl: createDepartmentRequest.server.iconUrl ?? null, // TODO: Implement media handling
        type: 'department',
        // createdBy: req.authorizedUser.id, // TODO: Implement authorization
      }
      const departmentServerEntity = await this.serverRepository
        .createServer(departmentServerInsert, trx)

      // Create Department
      const departmentInsert: InsertDepartmentEntity = {
        name: createDepartmentRequest.name,
        code: createDepartmentRequest.code,
        serverId: departmentServerEntity.id,
      }
      const departmentEntity = await this.departmentRepository
        .createDepartment(departmentInsert, trx)

      return toCreateDepartmentResponse(departmentEntity, departmentServerEntity)
    })
  }

  async createCourse(createCourseRequest: CreateCourseRequest): Promise<CreateCourseResponse> {
    try {
      const courseEntity = await this.departmentRepository.createCourse(createCourseRequest)
      return toCreateCourseResponse(courseEntity)
    }
    catch (err: unknown) {
      // Enrich known and expected DB errors
      if (err instanceof pg.DatabaseError && err.constraint === 'fk_courses_department_id')
        throw new BadRequestError('Wrong or Invalid departmentId')
      throw err
    }
  }

}