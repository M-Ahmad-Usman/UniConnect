
// Repositories
import UserRepository from './repositories/user.repository.js'
import TeacherRepository from './repositories/teacher.repository.js'
import StudentRepository from './repositories/student.repository.js'
import ServerRepository from '../server/server.repository.js'
import ClassRepository from '../class/class.repository.js'

import UserService from './user.service.js'
import { createUserRouter } from './user.router.js'
import { db } from '../../db/index.js'

const userRepository = new UserRepository(db)
const teacherRepository = new TeacherRepository(db)
const studentRepository = new StudentRepository(db)
const serverRepository = new ServerRepository(db)
const classRepository = new ClassRepository(db)

const userService = new UserService(
  db,
  userRepository,
  teacherRepository,
  studentRepository,
  serverRepository,
  classRepository,
)

export const userRouter = createUserRouter(userService)