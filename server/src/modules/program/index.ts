
// Repositories
import ProgramRepository from './program.repository.js'
import UserRepository from '../user/user.repository.js'

// Services
import ProgramService from './program.service.js'

// Program Router Factory
import createProgramRouter from './program.router.js'

// Kysely db instance
import { db } from '../../db/index.js'

const programRepository = new ProgramRepository(db)
const userRepository = new UserRepository(db)

const programService = new ProgramService(db, programRepository, userRepository)

const programRouter = createProgramRouter(programService)

export default programRouter