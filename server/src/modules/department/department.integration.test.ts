import { describe, it, expect } from 'vitest'
import request from 'supertest'

import app from '../../app.js'

// DTOs
import type { CreateDepartmentResponse } from './department.dto.js'

// Utils
import { generateDepartment } from '../../test/factories.js'
import { assertSuccessBody, assertErrorBody, findFieldError } from '../../test/helpers.js'

const api = request(app)

describe('/departments', () => {
  describe('POST /departments', () => {
    const ENDPOINT = '/departments'

    it('succeeds with status 201 on correct data', async () => {
      const department = generateDepartment()
      const res = await api.post(ENDPOINT).send(department)

      const body = assertSuccessBody<CreateDepartmentResponse>(res)

      expect(res.status).toBe(201)
      expect(body.data).toMatchObject(department)
    })

    describe('Input validations', () => {
      it('fails with status 422 on inputs with smaller lengths than required', async () => {
        const department = generateDepartment({
          name: 'a',
          code: 'b',
          server: { name: 'a' },
        })

        const res = await api.post(ENDPOINT).send(department)
        expect(res.status).toBe(422)

        const body = assertErrorBody(res)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        const nameFieldError = findFieldError(body.error.details, 'name')
        const codeFieldError = findFieldError(body.error.details, 'code')
        const serverNameFieldError = findFieldError(body.error.details, 'server.name')

        expect(nameFieldError).toBeDefined()
        expect(nameFieldError?.code).toBe('too_small')

        expect(codeFieldError).toBeDefined()
        expect(codeFieldError?.code).toBe('too_small')

        expect(serverNameFieldError).toBeDefined()
        expect(serverNameFieldError?.code).toBe('too_small')
      })

      it('fails with status 422 on with larger lengths than allowed', async () => {
        const department = generateDepartment({
          name: 'a'.repeat(101),
          code: 'b'.repeat(21),
          server: {
            name: 'a'.repeat(101),
            description: 'b'.repeat(1001),
          },
        })

        const res = await api.post(ENDPOINT).send(department)
        expect(res.status).toBe(422)

        const body = assertErrorBody(res)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        const nameFieldError = findFieldError(body.error.details, 'name')
        const codeFieldError = findFieldError(body.error.details, 'code')
        const serverNameFieldError = findFieldError(body.error.details, 'server.name')

        expect(nameFieldError).toBeDefined()
        expect(nameFieldError?.code).toBe('too_big')

        expect(codeFieldError).toBeDefined()
        expect(codeFieldError?.code).toBe('too_big')

        expect(serverNameFieldError).toBeDefined()
        expect(serverNameFieldError?.code).toBe('too_big')
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
  })
})