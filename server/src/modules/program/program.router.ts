
// Express
import { Router } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { Request, Response } from 'express'

// Services
import type ProgramService from './program.service.js'

// Validations
import { validate, validateContentType } from '../../core/middleware/index.js'
import { createProgramSchema, createProgramCurriculaSchema } from './program.schema.js'

// DTO Types
import type {
  CreateProgramRequest,
  CreateProgramResponse,
  CreateProgramCurriculaRequest,
  CreateProgramCurriculaResponse,
} from './program.dto.js'

// API Types
import type { SuccessResponseBody } from '../../core/types/api.js'

export default function createProgramRouter(programService: ProgramService): Router {

  const programRouter = Router()

  programRouter.post('/',
    validateContentType('application/json'),
    validate(createProgramSchema, 'body'),
    async (req: Request<ParamsDictionary, unknown, CreateProgramRequest>, res: Response) => {

      const programResponse: CreateProgramResponse = await programService.createProgram(req.body)

      const resBody: SuccessResponseBody<CreateProgramResponse> = {
        success: true,
        data: programResponse,
      }

      res.status(201).json(resBody)
    },
  )

  programRouter.post('/curricula',
    validateContentType('application/json'),
    validate(createProgramCurriculaSchema),
    async (req: Request<ParamsDictionary, unknown, CreateProgramCurriculaRequest>, res: Response) => {

      const programCurriculaResponse: CreateProgramCurriculaResponse =
        await programService.createProgramCurricula(req.body)

      const resBody: SuccessResponseBody<CreateProgramCurriculaResponse> = {
        success: true,
        data: programCurriculaResponse,
      }

      res.status(201).json(resBody)
    },
  )

  return programRouter
}