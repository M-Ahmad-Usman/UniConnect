
// Repositories
import UserRepository from './user.repository.js'
import ServerRepository from '../server/server.repository.js'
import ClassRepository from '../class/class.repository.js'
import DepartmentRepository from '../department/department.repository.js'

// Services
import UserService from './user.service.js'

// User Router Factory
import createUserRouter from './user.router.js'

// Kysely db instance
import { db } from '../../db/index.js'

const userRepository = new UserRepository(db)
const serverRepository = new ServerRepository(db)
const classRepository = new ClassRepository(db)
const departmentRepository = new DepartmentRepository(db)

const userService = new UserService(
  db,
  userRepository,
  serverRepository,
  classRepository,
  departmentRepository,
)

const userRouter = createUserRouter(userService)

export default userRouter