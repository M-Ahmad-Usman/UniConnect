
// Database
import pg from 'pg'
import type { Kysely } from 'kysely'
import type { Database } from '../../db/types.js'

// Repositories
import type CourseRepository from './course.repository.js'

// Errors
import { BadRequestError } from '../../core/errors/AppError.js'

// Utils

// Types
import type { CreateCourse } from './course.types.js'

export default class CourseService {

  constructor(
    private readonly db: Kysely<Database>, // use for creating transactions only,
    private readonly courseRepository: CourseRepository,
  ) { }

  async createCourse(createCourseData: CreateCourse) {

    try {
      return await this.courseRepository.createCourse(createCourseData)
    }
    catch (err: unknown) {
      // Enrich known and expected DB errors
      if (err instanceof pg.DatabaseError) {
        switch(err.constraint) {
          case 'fk_courses_department_id':
            throw new BadRequestError('Wrong or Invalid departmentId')
        }
      }
      throw err
    }
  }

}