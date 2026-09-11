import type { z } from 'zod'

import type {
  DepartmentEntity,
  ServerEntity,
  CourseEntity,
} from '../../db/types.js'
import type {
  createDepartmentSchema,
  createCourseSchema,
} from './department.schema.js'

export type CreateDepartmentRequest = z.infer<typeof createDepartmentSchema>
export type CreateCourseRequest = z.infer<typeof createCourseSchema>

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

export type CreateCourseResponse = CourseEntity

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
      iconUrl: departmentServerEntity.iconUrl,
    },
  }
}

export const toCreateCourseResponse = (courseEntity: CourseEntity): CreateCourseResponse => courseEntity
