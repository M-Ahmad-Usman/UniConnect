import type { z } from 'zod'
import type { createTeacherSchema, createStudentSchema } from './user.schema.js'
import type { UserEntity, StudentEntity, TeacherEntity } from '../../db/types.js'

export type CreateTeacherRequest = z.infer<typeof createTeacherSchema>
export type CreateStudentRequest = z.infer<typeof createStudentSchema>

interface CreateUserResponse {
  publicId: string
  fullName: string
  personalEmail: string
  universityEmail: string | null
  phone: string
  gender: string
  profilePictureUrl: string | null
  bio: string | null
}

export interface CreateStudentResponse extends CreateUserResponse {
  rollNumber: string
  classPublicId: string
}

export interface CreateTeacherResponse extends CreateUserResponse {
  designation: string
  departmentId: number
}

function toCreateBaseUserResponse(user: UserEntity): CreateUserResponse {
  return {
    publicId: user.publicId,
    fullName: user.fullName,
    personalEmail: user.personalEmail,
    universityEmail: user.universityEmail ?? null,
    phone: user.phone,
    gender: user.gender,
    profilePictureUrl: user.profilePictureUrl ?? null,
    bio: user.bio ?? null,
  }
}

export function toCreateStudentResponse(
  userEntity: UserEntity,
  studentEntity: StudentEntity,
  classPublicId: string,
): CreateStudentResponse {
  return {
    ...toCreateBaseUserResponse(userEntity),
    rollNumber: studentEntity.rollNumber,
    classPublicId,
  }
}

export function toCreateTeacherResponse(
  userEntity: UserEntity,
  teacherEntity: TeacherEntity,
): CreateTeacherResponse {
  return {
    ...toCreateBaseUserResponse(userEntity),
    designation: teacherEntity.designation,
    departmentId: teacherEntity.departmentId,
  }
}