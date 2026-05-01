
// Repositories
import DepartmentRepository from './department.repository.js'
import ServerRepository from '../server/server.repository.js'

// Services
import DepartmentService from './department.service.js'

// Department Router Factory
import createDepartmentRouter from './department.router.js'

// Kysely db instance
import { db } from '../../db/index.js'

const departmentRepository = new DepartmentRepository(db)
const serverRepository = new ServerRepository(db)

const departmentService = new DepartmentService(departmentRepository, serverRepository)

const departmentRouter = createDepartmentRouter(departmentService)

export default departmentRouter