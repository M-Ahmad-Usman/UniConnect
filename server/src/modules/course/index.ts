
// Repositories
import CourseRepository from './course.repository.js'

// Services
import CourseService from './course.service.js'

// Course Router Factory
import createCourseRouter from './course.router.js'

// Kysely db instance
import { db } from '../../db/index.js'

const courseRepository = new CourseRepository(db)

const courseService = new CourseService(
  db,
  courseRepository,
)

const courseRouter = createCourseRouter(courseService)

export default courseRouter