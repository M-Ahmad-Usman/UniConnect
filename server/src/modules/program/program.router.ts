
// Express
import { Router } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { Request, Response } from 'express'

// Services
import type ProgramService from './program.service.js'

// Validations
import { validate, validateContentType } from '../../core/middleware/index.js'
import { createProgramSchema, createProgramCurriculaSchema } from './program.schema.js'

// Types
import type { CreateProgram, CreateProgramCurricula } from './program.types.js'
import type { SuccessResponseBody } from '../../core/types/api.js'

export default function createProgramRouter(programService: ProgramService): Router {

  const programRouter = Router()

  programRouter.post('/',
    validateContentType('application/json'),
    validate(createProgramSchema, 'body'),
    async (req: Request<ParamsDictionary, unknown, CreateProgram>, res: Response) => {

      const newProgram = await programService.createProgram(req.body)

      const resBody: SuccessResponseBody<typeof newProgram> = {
        success: true,
        data: newProgram,
      }

      res.status(201).json(resBody)
    },
  )

  programRouter.post('/curricula',
    validateContentType('application/json'),
    validate(createProgramCurriculaSchema),
    async (req: Request<ParamsDictionary, unknown, CreateProgramCurricula>, res: Response) => {

      const newCurricula = await programService.createProgramCurricula(req.body)

      const resBody: SuccessResponseBody<typeof newCurricula> = {
        success: true,
        data: newCurricula,
      }

      res.status(201).json(resBody)
    },
  )

  return programRouter
}