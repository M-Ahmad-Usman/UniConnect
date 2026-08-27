
// Database
import type { Kysely } from 'kysely'
import type {
  Database,
  InsertServerEntity,
  InsertClassEntity,
} from '../../db/types.js'

// Repositories
import type ProgramRepository from '../program/program.repository.js'
import type ServerRepository from '../server/server.repository.js'

// Interface
import type { IClassRepository } from './class.interface.js'

// Errors
import { BadRequestError } from '../../core/errors/AppError.js'

// Utils
import { toCreateClassRespose } from './class.dto.js'

// DTOs
import type { CreateClassRequest, CreateClassResponse } from './class.dto.js'

export default class ClassService {

  constructor(
    private readonly db: Kysely<Database>, // use for creating transactions only
    private readonly classRepository: IClassRepository,
    private readonly programRepository: ProgramRepository,
    private readonly serverRepository: ServerRepository,
  ) { }

  async createClass(createClassRequest: CreateClassRequest): Promise<CreateClassResponse> {

    const classProgramEntity = await this.programRepository
      .getProgramDetails(createClassRequest.programId)

    if (!classProgramEntity)
      throw new BadRequestError('Wrong or invalid programId')

    // Validate that the class's current_semester doesn't exceeds the class's enrolled program's allowed semesters
    if (createClassRequest.currentSemester > classProgramEntity.totalSemesters)
      throw new BadRequestError(`Class's current_semester cannot exceed from its enrolled program's semesters. Max ${classProgramEntity.code} semesters: ${classProgramEntity.totalSemesters.toString()}`)

    return await this.db.transaction().execute(async trx => {

      const classServerInsert: InsertServerEntity = {
        name: `${classProgramEntity.code}-${createClassRequest.section}-${createClassRequest.admissionYear.toString()}`,
        type: 'class',
        description: 'Centralized hub for course materials, official announcements, and academic collaboration.',
        // createdBy: req.authorizedUser.id, // TODO: Implement authorization
      }
      const classServerEntity = await this.serverRepository
        .createServer(classServerInsert, trx)

      const classInsert: InsertClassEntity = {
        programId: createClassRequest.programId,
        currentSemester: createClassRequest.currentSemester,
        section: createClassRequest.section,

        academicYear: new Date().getFullYear(),
        admissionYear: createClassRequest.admissionYear,

        serverId: classServerEntity.id,
      }
      const classEntity = await this.classRepository
        .createClass(classInsert, trx)

      return toCreateClassRespose(classEntity, classServerEntity)
    })
  }
}