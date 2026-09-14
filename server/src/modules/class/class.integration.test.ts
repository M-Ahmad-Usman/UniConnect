import { describe, it, expect } from 'vitest'
import request from 'supertest'

import app from '../../app.js'

// Utils
import { assertSuccessBody, assertErrorBody, findFieldError } from '../../test/helpers.js'
import { createProgram, generateClass } from '../../test/factories.js'

// DTOs
import type { CreateClassResponse } from './class.dto.js'

const api = request(app)

describe('Class Module', () => {
  describe('POST /classes', () => {
    const ENDPOINT = '/classes'

    it('succeeds with status 201 on correct data', async () => {
      const { id: programId } = await createProgram()
      const classToCreate = generateClass({ programId })

      const res = await api.post(ENDPOINT).send(classToCreate).expect(201)

      const body = assertSuccessBody<CreateClassResponse>(res)

      expect(body.data).toMatchObject(classToCreate)
      expect(body.data.server).toBeDefined()
    })

    describe('Input validations', () => {
      it('fails with status 422 on invalid section', async () => {
        const res = await api.post(ENDPOINT)
          .send(generateClass({ section: 'C' }))
          .expect(422)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')

        const sectionFieldError = findFieldError(body.error.details, 'section')

        expect(sectionFieldError?.message).contain('A')
        expect(sectionFieldError?.message).contain('B')
      })

      it('fails with status 422 on negative currentSemester', async () => {
        const classToCreate = generateClass({ currentSemester: -1 })

        const res = await api.post(ENDPOINT).send(classToCreate).expect(422)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')

        const currentSemesterFieldError = findFieldError(body.error.details, 'currentSemester')

        expect(currentSemesterFieldError?.code).toMatch('too_small')
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
      it('fails with status 400 on non-existent program', async () => {
        const classToCreate = generateClass()

        const res = await api.post(ENDPOINT).send(classToCreate).expect(400)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('programId')
      })
    })
  })
})