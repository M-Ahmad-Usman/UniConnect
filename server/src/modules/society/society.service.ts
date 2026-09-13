// Database
import pg from 'pg'
import type { Kysely } from 'kysely'
import type { Database, InsertSocietyEntity, InsertServerEntity } from '../../db/types.js'

// DB Interfaces
import type { ISocietyRepository } from './society.interface.js'
import type { IServerRepository } from '../server/server.interface.js'
import type { IUserRepository } from '../user/user.interface.js'

// Errors
import { BadRequestError } from '../../core/errors/AppError.js'

// DTO
import type { CreateSocietyRequest, CreateSocietyResponse } from './society.dto.js'

// DTO Mappers
import { toCreateSocietyResponse } from './society.dto.js'

export default class SocietyService {

  constructor(
    private readonly db: Kysely<Database>,
    private readonly societyRepository: ISocietyRepository,
    private readonly serverRepository: IServerRepository,
    private readonly userRepository: IUserRepository,
  ) { }

  async createSociety(createSocietyRequest: CreateSocietyRequest): Promise<CreateSocietyResponse> {

    try {
      return await this.db.transaction().execute(async trx => {

        const presidentId = await this.userRepository.findIdByPublicId(createSocietyRequest.presidentPublicId)
        if (presidentId === undefined)
          throw new BadRequestError('Wrong or Invalid presidentPublicId')

        const convenorId = await this.userRepository.findIdByPublicId(createSocietyRequest.convenorPublicId)
        if (convenorId === undefined)
          throw new BadRequestError('Wrong or Invalid convenorPublicId')

        const societyServerInsert: InsertServerEntity = {
          name: createSocietyRequest.server.name,
          type: 'society',
          description: createSocietyRequest.server.description ?? null,
          iconUrl: createSocietyRequest.server.iconUrl ?? null,
        }

        const societyServerEntity = await this.serverRepository.createServer(societyServerInsert, trx)

        const societyInsert: InsertSocietyEntity = {
          name: createSocietyRequest.name,
          description: createSocietyRequest.description ?? null,

          departmentId: createSocietyRequest.departmentId,
          presidentId,
          convenorId,
          serverId: societyServerEntity.id,
        }

        const societyEntity = await this.societyRepository.createSociety(societyInsert, trx)

        return toCreateSocietyResponse(societyEntity, societyServerEntity, {
          presidentPublicId: createSocietyRequest.presidentPublicId,
          convenorPublicId: createSocietyRequest.convenorPublicId,
        })

      })
    } catch (err: unknown) {
      if (err instanceof pg.DatabaseError && err.constraint === 'fk_societies_department_id')
        throw new BadRequestError('Wrong or Invalid departmentId')
      throw err
    }
  }
}