
// Database
import type { Kysely } from 'kysely'
import type {
  Database,
  InsertServerEntity,
  InsertClassEntity,
} from '../../db/types.js'

// Repositories

// DB Interface
import type { IClassRepository } from './class.interface.js'
import type { IServerRepository } from '../server/server.interface.js'
import type { IProgramRepository } from '../program/program.interface.js'

// Errors
import { BadRequestError } from '../../core/errors/AppError.js'

// DTO Types
import type { CreateClassRequest, CreateClassResponse } from './class.dto.js'

// DTO Mappers
import { toCreateClassRespose } from './class.dto.js'

export default class ClassService {

  constructor(
    private readonly db: Kysely<Database>, // use for creating transactions only
    private readonly classRepository: IClassRepository,
    private readonly programRepository: IProgramRepository,
    private readonly serverRepository: IServerRepository,
  ) { }

  async createClass(createClassRequest: CreateClassRequest): Promise<CreateClassResponse> {

    const classProgramEntity = await this.programRepository
      .findProgramById(createClassRequest.programId)

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