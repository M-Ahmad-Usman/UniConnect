import { describe, it, expect } from 'vitest'
import request from 'supertest'

import app from '../../app.js'

// Utils
import { assertSuccessBody, assertErrorBody, findFieldError } from '../../test/helpers.js'
import { createProgram, generateClass } from '../../test/factories.js'

// DTOs
import type { CreateClassResponse } from './class.dto.js'

const api = request(app)

describe('/classes', () => {
  describe('POST /classes', () => {
    const ENDPOINT = '/classes'

    it('succeeds with status 201 on correct data', async () => {
      const programId = (await createProgram()).id
      const classToCreate = generateClass({ programId })

      const res = await api.post(ENDPOINT).send(classToCreate)

      const body = assertSuccessBody<CreateClassResponse>(res)

      expect(res.status).toBe(201)
      expect(body.data).toMatchObject(classToCreate)
      expect(body.data.server).toBeDefined()
    })

    describe('Input validations', () => {
      it('fails with status 422 on invalid section', async () => {
        const res = await api.post(ENDPOINT)
          .send(generateClass({ section: 'C' }))

        const body = assertErrorBody(res)

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        const sectionFieldError = findFieldError(body.error.details, 'section')

        expect(sectionFieldError).toBeDefined()
        expect(sectionFieldError?.field).toBe('section')
        expect(sectionFieldError?.message).contain('A')
        expect(sectionFieldError?.message).contain('B')
      })

      it('fails with status 422 on negative currentSemester', async () => {
        const classToCreate = generateClass({ currentSemester: -1 })

        const res = await api.post(ENDPOINT).send(classToCreate)

        const body = assertErrorBody(res)

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        const currentSemesterFieldError = findFieldError(body.error.details, 'currentSemester')

        expect(currentSemesterFieldError).toBeDefined()
        expect(currentSemesterFieldError?.code).toContain('too_small')
      })

      it('fails with status 415 if data with invalid content type is provided', async () => {
        const res = await api.post(ENDPOINT)
          .set('Content-Type', 'text/html')
          .send('<p>Hello World</p>')

        const body = assertErrorBody(res)
        expect(res.status).toBe(415)
        expect(body.error.type).toBe('INVALID_CONTENT_TYPE')
        expect(body.error.message).toContain('application/json')
      })

      it('fails with status 400 if invalid json is provided', async () => {
        const res = await api.post(ENDPOINT)
          .send('{ "name": "Ahmad", }')
          .set('Content-Type', 'application/json')
          .expect(400)

        const body = assertErrorBody(res)

        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message.toLowerCase()).toContain('json')
      })
    })

    describe('DB dependent validations', () => {
      it('fails with status 400 on incorrect programId', async () => {
        const classToCreate = generateClass()

        const res = await api.post(ENDPOINT).send(classToCreate)

        const body = assertErrorBody(res)

        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('programId')
      })
    })
  })
})