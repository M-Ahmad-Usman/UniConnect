import { Router } from 'express'

import UserRepository from './user.repository.js'
import UserService from './user.service.js'
import UserController from './user.controller.js'

import { db } from '../../db/index.js'
import { validate } from '../../core/middleware/validate.js'
import { teacherCreateSchema } from './user.schema.js'

const userRepository = new UserRepository(db)
const userService = new UserService(userRepository)
const userController = new UserController(userService)

const userRouter = Router()

userRouter.post('/teachers',
  validate(teacherCreateSchema, 'body'),
  userController.createTeacher.bind(userController),
)