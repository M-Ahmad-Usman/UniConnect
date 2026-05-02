
// Database
import type { Kysely } from 'kysely'
import type {
  Database,
  InsertServerEntity,
  InsertClassEntity,
} from '../../db/types.js'

// Repositories
import type ClassRepository from './class.repository.js'
import type ProgramRepository from '../program/program.repository.js'
import type ServerRepository from '../server/server.repository.js'

// Errors
import { BadRequestError } from '../../core/errors/AppError.js'

// Utils

// Types
import type { CreateClass } from './class.types.js'

export default class ClassService {

  constructor(
    private readonly db: Kysely<Database>, // use for creating transactions only
    private readonly classRepository: ClassRepository,
    private readonly programRepository: ProgramRepository,
    private readonly serverRepository: ServerRepository,
  ) { }

  async createClass(createClassData: CreateClass) {

    const programDetails = await this.programRepository
      .getProgramDetails(createClassData.programId)

    if (!programDetails)
      throw new BadRequestError('Wrong or invalid ProgramId')

    // Validate that the class's current_semester doesn't exceeds the class's enrolled program's allowed semesters
    if (createClassData.currentSemester > programDetails.semesters)
      throw new BadRequestError(`Class's current_semester cannot exceed from its enrolled program's semesters. Max ${programDetails.code} semesters: ${programDetails.semesters.toString()}`)

    return await this.db.transaction().execute(async trx => {

      const createClassServerInfo: InsertServerEntity = {
        name: `${programDetails.code}-${createClassData.section}-${createClassData.admissionYear.toString()}`,
        type: 'class',
        description: 'Centralized hub for course materials, official announcements, and academic collaboration.',
        // createdBy: req.authorizedUser.id, // TODO: Implement authorization
      }
      const createdClassServerInfo = await this.serverRepository
        .createServer(createClassServerInfo, trx)

      const createClassInfo: InsertClassEntity = {
        programId: createClassData.programId,
        currentSemester: createClassData.currentSemester,
        section: createClassData.section,

        academicYear: new Date().getFullYear(),
        admissionYear: createClassData.admissionYear,

        serverId: createdClassServerInfo.id,
      }
      const createdClassInfo = await this.classRepository
        .createClass(createClassInfo, trx)

      const classDetails = {
        publicId: createdClassInfo.publicId,
        programId: createdClassInfo.programId,
        currentSemester: createdClassInfo.currentSemester,

        crId: null,

        academicYear: createdClassInfo.academicYear,
        admissionYear: createdClassInfo.admissionYear,

        server: {
          publicId: createdClassServerInfo.publicId,

          name: createdClassServerInfo.name,
          description: createdClassServerInfo.description,
          iconUrl: createdClassServerInfo.iconUrl ?? null,
        },
      }

      return classDetails
    })
  }
}