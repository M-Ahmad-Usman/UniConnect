import type { z } from 'zod'
import type { ClassEntity, ServerEntity } from '../../db/types.js'
import type { createClassSchema } from './class.schema.js'

export type CreateClassRequest = z.infer<typeof createClassSchema>

export interface CreateClassResponse {
  publicId: string,
  programId: number,
  currentSemester: number,
  section: string,

  crId: null

  academicYear: number,
  admissionYear: number,

  server: {
    publicId: string,
    name: string,
    description: string | null
    iconUrl: string | null
  }
}

export function toCreateClassRespose(
  classEntity: ClassEntity,
  classServerEntity: ServerEntity,
): CreateClassResponse {
  return {
    publicId: classEntity.publicId,
    programId: classEntity.programId,
    currentSemester: classEntity.currentSemester,
    section: classEntity.section,

    crId: null,

    academicYear: classEntity.academicYear,
    admissionYear: classEntity.admissionYear,

    server: {
      publicId: classServerEntity.publicId,
      name: classServerEntity.name,
      description: classServerEntity.description,
      iconUrl: classServerEntity.iconUrl,
    },
  }
}