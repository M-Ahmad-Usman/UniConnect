
// Repositories
import type DepartmentRepository from './department.repository.js'
import type ServerRepository from '../server/server.repository.js'

// Data Types
import type { InsertDepartmentEntity, InsertServerEntity } from '../../db/types.js'
import type { CreateDepartment } from './department.types.js'

export default class DepartmentService {

  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly serverRepository: ServerRepository,
  ) {}

  async createDepartment(createDepartmentData: CreateDepartment) {

    // Create Department Server
    const createDepartmentServerInfo: InsertServerEntity = {
      name: createDepartmentData.serverName,
      description: createDepartmentData.description ?? null,
      iconUrl: createDepartmentData.iconUrl ?? null, // TODO: Implement media handling
      type: 'department',
      // createdBy: req.authorizedUser.id, // TODO: Implement authorization
    }
    const rawDepartmentServerData = await this.serverRepository
      .createServer(createDepartmentServerInfo)

    // Create Department
    const createDepartmentInfo: InsertDepartmentEntity = {
      name: createDepartmentData.name,
      code: createDepartmentData.code,
      serverId: rawDepartmentServerData.id,
    }
    const rawDepartmentData = await this.departmentRepository
      .createDepartment(createDepartmentInfo)

    const departmentDetails = {
      id: rawDepartmentData.id,
      name: rawDepartmentData.name,
      code: rawDepartmentData.code,
      hodId: null,

      server: {
        publicId: rawDepartmentServerData.publicId,
        name: rawDepartmentServerData.name,
        description: rawDepartmentServerData.description,
        iconUrl: rawDepartmentServerData.iconUrl,
      },
    }

    return departmentDetails
  }

}