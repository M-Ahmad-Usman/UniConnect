
// Database
import type { Kysely } from 'kysely'
import type {
  Database,
  InsertDepartmentEntity,
  InsertServerEntity,
} from '../../db/types.js'

import type ServerRepository from '../server/server.repository.js'

// DB Interface
import type { IDepartmentRepository } from './department.interface.js'

// DTO Types
import type { CreateDepartmentRequest, CreateDepartmentResponse } from './department.dto.js'

// DTO Mappers
import { toCreateDepartmentResponse } from './department.dto.js'

export default class DepartmentService {

  constructor(
    private readonly db: Kysely<Database>, // use for creating transactions only
    private readonly departmentRepository: IDepartmentRepository,
    private readonly serverRepository: ServerRepository,
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

}