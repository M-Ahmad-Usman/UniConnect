import { describe, it, expect } from 'vitest'
import request from 'supertest'

import app from '../../app.js'

// DTOs
import type { CreateDepartmentResponse, CreateCourseResponse } from './department.dto.js'

// Utils
import { generateDepartment, generateCourse, createDepartment } from '../../test/factories.js'
import { assertSuccessBody, assertErrorBody, findFieldError } from '../../test/helpers.js'

const api = request(app)

describe('Department Module', () => {
  describe('POST /departments', () => {
    const ENDPOINT = '/departments'

    it('succeeds with status 201 on correct data', async () => {
      const department = generateDepartment()

      const res = await api.post(ENDPOINT).send(department).expect(201)

      const body = assertSuccessBody<CreateDepartmentResponse>(res)

      expect(body.data).toMatchObject(department)
    })

    describe('Input validations', () => {
      it('fails with status 422 on inputs smaller than required', async () => {
        const department = generateDepartment({
          name: 'a',
          code: 'b',
          server: { name: 'a' },
        })

        const res = await api.post(ENDPOINT).send(department).expect(422)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')

        const nameFieldError = findFieldError(body.error.details, 'name')
        const codeFieldError = findFieldError(body.error.details, 'code')
        const serverNameFieldError = findFieldError(body.error.details, 'server.name')

        expect(nameFieldError?.code).toBe('too_small')
        expect(codeFieldError?.code).toBe('too_small')
        expect(serverNameFieldError?.code).toBe('too_small')
      })

      it('fails with status 422 on inputs larger than allowed', async () => {
        const department = generateDepartment({
          name: 'a'.repeat(101),
          code: 'b'.repeat(21),
          server: {
            name: 'a'.repeat(101),
            description: 'b'.repeat(1001),
          },
        })

        const res = await api.post(ENDPOINT).send(department).expect(422)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')

        const nameFieldError = findFieldError(body.error.details, 'name')
        const codeFieldError = findFieldError(body.error.details, 'code')
        const serverNameFieldError = findFieldError(body.error.details, 'server.name')

        expect(nameFieldError?.code).toBe('too_big')
        expect(codeFieldError?.code).toBe('too_big')
        expect(serverNameFieldError?.code).toBe('too_big')
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
  })

  describe('POST /departments/courses', () => {
    const ENDPOINT = '/departments/courses'

    it('succeeds with status 201 on correct data', async () => {
      const { id: departmentId } = await createDepartment()
      const course = generateCourse({ departmentId })

      const res = await api.post(ENDPOINT).send(course).expect(201)

      const body = assertSuccessBody<CreateCourseResponse>(res)

      expect(body.data).toMatchObject(course)
    })

    describe('Input Validations', () => {
      it('fails with status 422 on inputs smaller than required', async () => {
        const course = generateCourse({ title: 'a', code: 'b', creditHours: -1 })

        const res = await api.post(ENDPOINT).send(course).expect(422)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')

        const titleFieldError = findFieldError(body.error.details, 'title')
        const codeFieldError = findFieldError(body.error.details, 'code')
        const creditHoursFieldError = findFieldError(body.error.details, 'creditHours')

        expect(titleFieldError?.code).toBe('too_small')
        expect(codeFieldError?.code).toBe('too_small')
        expect(creditHoursFieldError?.code).toBe('too_small')
      })

      it('fails with status 422 on inputs larger than allowed', async () => {
        const course = generateCourse({
          title: 'a'.repeat(101),
          code: 'b'.repeat(51),
          creditHours: 4,
        })

        const res = await api.post(ENDPOINT).send(course).expect(422)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')

        const titleFieldError = findFieldError(body.error.details, 'title')
        const codeFieldError = findFieldError(body.error.details, 'code')
        const creditHoursFieldError = findFieldError(body.error.details, 'creditHours')

        expect(titleFieldError?.code).toBe('too_big')
        expect(codeFieldError?.code).toBe('too_big')
        expect(creditHoursFieldError?.code).toBe('too_big')
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
        const course = generateCourse()

        const res = await api.post(ENDPOINT).send(course).expect(400)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')

        expect(body.error.message).toMatch('departmentId')
      })
    })
  })
})