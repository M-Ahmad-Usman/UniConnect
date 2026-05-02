
// Repositorues
import ClassRepository from './class.repository.js'
import ProgramRepository from '../program/program.repository.js'
import ServerRepository from '../server/server.repository.js'

// Services
import ClassService from './class.service.js'

// Class Router Factory
import createClassRouter from './class.router.js'

// Kysely db instance
import { db } from '../../db/index.js'

const classRepository = new ClassRepository(db)
const programRepository = new ProgramRepository(db)
const serverRepository = new ServerRepository(db)

const classService = new ClassService(
  db,
  classRepository,
  programRepository,
  serverRepository,
)

const classRouter = createClassRouter(classService)

export default classRouter