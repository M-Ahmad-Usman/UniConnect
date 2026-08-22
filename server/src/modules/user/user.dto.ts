import type { z } from 'zod'
import type { createTeacherSchema, createStudentSchema } from './user.schema.js'
import type { UserEntity, StudentEntity, TeacherEntity } from '../../db/types.js'

export type CreateTeacherRequest = z.infer<typeof createTeacherSchema>
export type CreateStudentRequest = z.infer<typeof createStudentSchema>

interface UserResponse {
  publicId: string
  fullName: string
  personalEmail: string
  universityEmail: string | null
  phone: string
  gender: string
  profilePictureUrl: string | null
  bio: string | null
}

export interface StudentResponse extends UserResponse {
  rollNumber: string
  classPublicId: string
}

export interface TeacherResponse extends UserResponse {
  designation: string
  departmentId: number
}

function toBaseUserResponse(user: UserEntity): UserResponse {
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

export function toStudentResponse(
  userEntity: UserEntity,
  studentEntity: StudentEntity,
  classPublicId: string,
): StudentResponse {
  return {
    ...toBaseUserResponse(userEntity),
    rollNumber: studentEntity.rollNumber,
    classPublicId,
  }
}

export function toTeacherResponse(
  userEntity: UserEntity,
  teacherEntity: TeacherEntity,
): TeacherResponse {
  return {
    ...toBaseUserResponse(userEntity),
    designation: teacherEntity.designation,
    departmentId: teacherEntity.departmentId,
  }
}