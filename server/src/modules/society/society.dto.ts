import type { z } from 'zod'
import type { ServerEntity, SocietyEntity } from '../../db/types.js'
import type { createSocietySchema } from './society.schema.js'

export type CreateSocietyRequest = z.infer<typeof createSocietySchema>

export interface CreateSocietyResponse {
  publicId: string,
  name: string,
  description: string | null,

  departmentId: number,
  presidentPublicId: string,
  convenorPublicId: string,

  isDeleted: false,
  deletedBy: null,
  deletedAt: null,

  createdAt: Date

  server: {
    name: string,
    description: string | null,
    publicId: string
  }
}

export const toCreateSocietyResponse = (
  societyEntity: SocietyEntity,
  societyServerEntity: ServerEntity,
  userPublicIds: {
    presidentPublicId: string,
    convenorPublicId: string,
  },
): CreateSocietyResponse => {
  return {
    publicId: societyEntity.publicId,
    name: societyEntity.name,
    description: societyEntity.description,

    departmentId: societyEntity.departmentId,
    presidentPublicId: userPublicIds.presidentPublicId,
    convenorPublicId: userPublicIds.convenorPublicId,

    isDeleted: false,
    deletedBy: null,
    deletedAt: null,

    createdAt: societyEntity.createdAt,

    server: {
      name: societyServerEntity.name,
      description: societyServerEntity.description,
      publicId: societyServerEntity.publicId,
    },
  }
}