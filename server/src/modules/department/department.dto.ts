
import type { DepartmentEntity, ServerEntity } from '../../db/types.js'
import type { createDepartmentSchema } from './department.schema.js'
import type { z } from 'zod'

export type CreateDepartmentRequest = z.infer<typeof createDepartmentSchema>

export interface CreateDepartmentResponse {
  id: number,
  name: string,
  code: string,
  hodId: null,

  server: {
    publicId: string,
    name: string,
    description: string | null,
    iconUrl: string | null,
  },
}

export const toCreateDepartmentResponse = (
  departmentEntity: DepartmentEntity,
  departmentServerEntity: ServerEntity,
): CreateDepartmentResponse => {
  return {
    id: departmentEntity.id,
    name: departmentEntity.name,
    code: departmentEntity.code,
    hodId: null,
    server: {
      publicId: departmentServerEntity.publicId,
      name: departmentServerEntity.name,
      description: departmentServerEntity.description,
      iconUrl: departmentServerEntity.iconUrl
    }
  }
}
