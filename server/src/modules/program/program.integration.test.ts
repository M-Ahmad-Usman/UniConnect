import { describe, it, expect } from 'vitest'
import request from 'supertest'

import app from '../../app.js'

// DTOs
import type { CreateProgramResponse } from './program.dto.js'

// Utils
import { createDepartment, createTeacher, generateProgram } from '../../test/factories.js'
import { assertErrorBody, assertSuccessBody, findFieldError } from '../../test/helpers.js'

const api = request(app)

describe('/programs', () => {
  describe('POST /programs', () => {
    const ENDPOINT = '/programs'

    it('succeeds with status 201 on correct data', async () => {
      const departmentId = (await createDepartment()).id
      const directorPublicId = (await createTeacher({ teacherOverrides: { departmentId } })).publicId

      const program = generateProgram({ departmentId, directorPublicId })

      const res = await api.post(ENDPOINT).send(program)
      const body = assertSuccessBody<CreateProgramResponse>(res)

      expect(res.status).toBe(201)
      expect(body.data).toMatchObject(program)
    })

    describe('Input validations', () => {
      it('fails with status 422 on invalid totalSemesters or code value', async () => {
        const departmentId = (await createDepartment()).id
        const directorPublicId = (await createTeacher({ teacherOverrides: { departmentId } })).publicId

        const program = generateProgram({
          departmentId,
          directorPublicId,
          totalSemesters: -1,
          code: 'a'
        })

        const res = await api.post(ENDPOINT).send(program)
        const body = assertErrorBody(res)

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        const totalSemestersFieldError = findFieldError(body.error.details, 'totalSemesters')
        const codeFieldError = findFieldError(body.error.details, 'code')

        expect(totalSemestersFieldError).toBeDefined()
        expect(totalSemestersFieldError?.code).toBe('too_small')

        expect(codeFieldError).toBeDefined()
        expect(codeFieldError?.code).toBe('too_small')
      })

      it('fails with status 400 on invalid degreeLevel', async () => {
        const departmentId = (await createDepartment()).id
        const directorPublicId = (await createTeacher({ teacherOverrides: { departmentId } })).publicId

        const program = generateProgram({
          departmentId,
          directorPublicId,
          degreeLevel: 'incorrect'
        })

        const res = await api.post(ENDPOINT).send(program)
        const body = assertErrorBody(res)

        expect(res.status).toBe(422)

        expect(body.error.type).toBe('VALIDATION_FAILED')

        const degreeLevelFieldError = findFieldError(body.error.details, 'degreeLevel')

        expect(degreeLevelFieldError).toBeDefined()
        expect(degreeLevelFieldError?.code).toBe('invalid_value')

        // Expected values
        expect(degreeLevelFieldError?.message).toContain('bachelors')
        expect(degreeLevelFieldError?.message).toContain('masters')
        expect(degreeLevelFieldError?.message).toContain('phd')
      })

      it('fails with status 415 if data with invalid content type is provided', async () => {
        const res = await api.post(ENDPOINT)
          .set('Content-Type', 'text/html')
          .send('<p>Hello World</p>')

        expect(res.status).toBe(415)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('INVALID_CONTENT_TYPE')
        expect(body.error.message).toContain('application/json')
      })

      it('fails with status 400 if invalid json is provided', async () => {
        const res = await api.post(ENDPOINT)
          .send('{ "name": "Ahmad", }')
          .set('Content-Type', 'application/json')
          .expect(400)

        expect(res.status).toBe(400)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message.toLowerCase()).toContain('json')
      })
    })

    describe('DB dependent validations', () => {
      it('fails with status 400 on incorrect departmentId', async () => {
        const departmentId = (await createDepartment()).id
        const directorPublicId = (await createTeacher({ teacherOverrides: { departmentId } })).publicId

        const program = generateProgram({ departmentId: 10000, directorPublicId })

        const res = await api.post(ENDPOINT).send(program)
        const body = assertErrorBody(res)

        expect(res.status).toBe(400)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('departmentId')
      })

      it('fails with status 400 on incorrect discipline', async () => {
        const departmentId = (await createDepartment()).id
        const directorPublicId = (await createTeacher({ teacherOverrides: { departmentId } })).publicId

        const program = generateProgram({
          departmentId,
          directorPublicId,
          discipline: 'incorrect'
        })

        const res = await api.post(ENDPOINT).send(program)
        const body = assertErrorBody(res)

        expect(res.status).toBe(400)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('discipline')
      })

      it('fails with status 400 on invalid directorPublicId', async () => {
        const departmentId = (await createDepartment()).id

        const program = generateProgram({ departmentId })

        const res = await api.post(ENDPOINT).send(program)
        const body = assertErrorBody(res)

        expect(res.status).toBe(400)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('directorPublicId')
      })
    })
  })
})