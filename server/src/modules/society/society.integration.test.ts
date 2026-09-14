import { describe, it, expect } from 'vitest'
import request from 'supertest'

import app from '../../app.js'

// DTOs
import type { CreateSocietyResponse } from './society.dto.js'

// Utils
import {
  createDepartment,
  createStudent,
  createTeacher,
  createProgram,
  createClass,
  generateSociety,
} from '../../test/factories.js'
import {
  assertErrorBody,
  assertSuccessBody,
  findFieldError,
} from '../../test/helpers.js'

const api = request(app)

describe('Society Module', () => {
  describe('POST /societies', () => {
    const ENDPOINT = '/societies'

    it('succeeds with status 201 on correct data', async () => {
      // Performance Note: performance can be improved by wrapping all following 5 calls
      // into a single transaction. Factory functions already accepts transactions.
      const { id: departmentId } = await createDepartment()
      const { id: programDirectorId, publicId: convenorPublicId } = await createTeacher({ teacherOverrides: { departmentId } })
      const { id: programId } = await createProgram({ programOverrides: { departmentId, programDirectorId } })
      const { id: classId } = await createClass({ classOverrides: { programId } })
      const { publicId: presidentPublicId } = await createStudent({ studentOverrides: { classId } })

      const society = generateSociety({ departmentId, presidentPublicId, convenorPublicId })

      const res = await api.post(ENDPOINT).send(society).expect(201)

      const body = assertSuccessBody<CreateSocietyResponse>(res)

      expect(body.data).toMatchObject(society)
    })

    describe('Input Validations', () => {
      it('fails with status 422 on inputs smaller than required', async () => {
        const society = generateSociety({ name: 'a', server: { name: 'a' } })

        const res = await api.post(ENDPOINT).send(society).expect(422)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')
        expect(body.error.details.length).toBe(2)

        const nameFieldError = findFieldError(body.error.details, 'name')
        const serverNameFieldError = findFieldError(body.error.details, 'server.name')

        expect(nameFieldError?.code).toMatch('too_small')
        expect(serverNameFieldError?.code).toMatch('too_small')
      })

      it('fails with status 422 on inputs larger than allowed', async () => {
        const society = generateSociety({
          name: 'a'.repeat(101),
          description: 'a'.repeat(1000),

          server: {
            name: 'a'.repeat(101),
            description: 'a'.repeat(1000),
          },
        })

        const res = await api.post(ENDPOINT).send(society).expect(422)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')
        expect(body.error.details.length).toBe(2)

        const nameFieldError = findFieldError(body.error.details, 'name')
        const serverNameFieldError = findFieldError(body.error.details, 'server.name')

        expect(nameFieldError?.code).toMatch('too_big')
        expect(serverNameFieldError?.code).toMatch('too_big')
      })

      it("fails with status 422 if president or convenor publicIds aren't UUIDv7", async () => {
        const society = generateSociety({
          presidentPublicId: '123',
          convenorPublicId: '132',
        })

        const res = await api.post(ENDPOINT).send(society).expect(422)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')
        expect(body.error.details.length).toBe(2)

        const presidentPublicIdFieldError = findFieldError(body.error.details, 'presidentPublicId')
        const convenorPublicIdFieldError = findFieldError(body.error.details, 'convenorPublicId')

        expect(presidentPublicIdFieldError?.code).toMatch('invalid_format')
        expect(convenorPublicIdFieldError?.code).toMatch('invalid_format')
      })

      it('fails with status 415 on unexpected Content-Type', async () => {
        const res = await api.post(ENDPOINT)
          .set('Content-Type', 'text/html')
          .send('<p>Hello World</p>')
          .expect(415)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('INVALID_CONTENT_TYPE')
        expect(body.error.message).toContain('application/json')
      })

      it('fails with status 400 on malformatted JSON', async () => {
        const res = await api.post(ENDPOINT)
          .send('{ "name": "Ahmad", }')
          .set('Content-Type', 'application/json')
          .expect(400)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message.toLowerCase()).toContain('json')
      })
    })

    describe('DB dependent validations', () => {
      it('fails with status 400 on non-existent department', async () => {
        const { publicId: presidentPublicId } = await createStudent()
        const { publicId: convenorPublicId } = await createTeacher()

        const society = generateSociety({
          presidentPublicId,
          convenorPublicId,
          departmentId: 100,
        })

        const res = await api.post(ENDPOINT).send(society).expect(400)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toMatch('departmentId')
      })

      it('fails with status 400 on non-existent president', async () => {
        const { id: departmentId } = await createDepartment()
        const { publicId: convenorPublicId } = await createTeacher({ teacherOverrides: { departmentId } })

        const society = generateSociety({
          departmentId,
          convenorPublicId,
        })

        const res = await api.post(ENDPOINT).send(society).expect(400)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toMatch('presidentPublicId')
      })

      it('fails with status 400 on non-existent convenor', async () => {
        const { id: departmentId } = await createDepartment()
        const { publicId: presidentPublicId } = await createStudent()

        const society = generateSociety({
          departmentId,
          presidentPublicId,
        })

        const res = await api.post(ENDPOINT).send(society).expect(400)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toMatch('convenorPublicId')
      })
    })
  })
})