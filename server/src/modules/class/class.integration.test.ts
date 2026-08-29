import { describe, it, expect } from 'vitest'
import request from 'supertest'

import app from '../../app.js'

// Utils
import * as testFactory from '../../test/factories.js'
import * as testHelper from '../../test/helpers.js'

// DTOs
import type { CreateClassResponse } from './class.dto.js'

const api = request(app)

describe('/classes', () => {
  describe('POST /classes', () => {
    const ENDPOINT = '/classes'

    it('succeeds with status 201 on correct data', async () => {
      const classEnrolledProgram = await testFactory.createProgram()
      const classToCreate = testFactory.generateClass({ programId: classEnrolledProgram.id })

      const res = await api.post(ENDPOINT).send(classToCreate)

      const body = testHelper.assertSuccessBody<CreateClassResponse>(res)

      expect(res.status).toBe(201)
      expect(body.data).toMatchObject(classToCreate)
      expect(body.data.server).toBeDefined()
    })

    describe('Input validations', () => {
      it('fails with status 422 on invalid section', async () => {
        const res = await api.post(ENDPOINT)
          .send(testFactory.generateClass({ section: 'C' }))

        const body = testHelper.assertErrorBody(res)

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        const sectionFieldError = body.error.details.find(fieldError => fieldError.field === 'section')

        expect(sectionFieldError).toBeDefined()
        expect(sectionFieldError?.field).toBe('section')
        expect(sectionFieldError?.message).contain('A')
        expect(sectionFieldError?.message).contain('B')
      })

      it('fails with status 422 on negative currentSemester', async () => {
        const classToCreate = testFactory.generateClass({ currentSemester: -1 })

        const res = await api.post(ENDPOINT).send(classToCreate)

        const body = testHelper.assertErrorBody(res)

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        const currentSemesterFieldError = body.error.details.find(fieldError => fieldError.field === 'currentSemester')

        expect(currentSemesterFieldError).toBeDefined()
        expect(currentSemesterFieldError?.message.toLocaleLowerCase()).toContain('too small')
      })

      it('fails with status 415 if data with invalid content type is provided', async () => {
        const res = await api.post(ENDPOINT)
          .set('Content-Type', 'text/html')
          .send('<p>Hello World</p>')

        const body = testHelper.assertErrorBody(res)
        expect(res.status).toBe(415)
        expect(body.error.type).toBe('INVALID_CONTENT_TYPE')
        expect(body.error.message).toContain('application/json')
      })

      it('fails with status 400 if invalid json is provided', async () => {
        const res = await api.post(ENDPOINT)
          .send('{ "name": "Ahmad", }')
          .set('Content-Type', 'application/json')
          .expect(400)

        const body = testHelper.assertErrorBody(res)

        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message.toLowerCase()).toContain('json')
      })
    })

    describe('DB dependent validations', () => {
      it('fails with status 400 on incorrect programId', async () => {
        const classToCreate = testFactory.generateClass()

        const res = await api.post(ENDPOINT).send(classToCreate)

        const body = testHelper.assertErrorBody(res)

        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('programId')
      })
    })
  })
})