import type { Request, Response } from 'express'

import type UserService from './user.service.js'

import type { SuccessResponseBody } from '../../core/types/api.js'
import type { UserEntity, TeacherEntity } from '../../db/types.js'
import type { TeacherCreateInput } from './user.schema.js'

export default class UserController {

  constructor(private readonly userService: UserService) { }

  async createTeacher (
    request: Request<Record<string, never>, unknown, TeacherCreateInput>,
    response: Response,
  ) {

    const newTeacher: UserEntity & TeacherEntity =
      await this.userService.createTeacher(request.body)

    const responseBody: SuccessResponseBody<UserEntity & TeacherEntity> = {
      success: true,
      data: newTeacher,
    }

    response.status(200).json(responseBody)
  }

}

