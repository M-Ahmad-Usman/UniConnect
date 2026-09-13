// Repositories
import SocietyRepository from './society.repository.js'
import ServerRepository from '../server/server.repository.js'
import UserRepository from '../user/user.repository.js'

// Services
import SocietyService from './society.service.js'

// Society Router Factory
import createSocietyRouter from './society.router.js'

// Kysely db instance
import { db } from '../../db/index.js'

const societyRepository = new SocietyRepository(db)
const serverRepository = new ServerRepository(db)
const userRepository = new UserRepository(db)

const societyService = new SocietyService(
  db,
  societyRepository,
  serverRepository,
  userRepository,
)

const societyRouter = createSocietyRouter(societyService)

export default societyRouter