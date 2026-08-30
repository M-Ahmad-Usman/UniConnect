import { describe, it, expect } from 'vitest'
import request from 'supertest'

import app from '../../app.js'

// Utils
import { assertSuccessBody, assertErrorBody, findFieldError } from '../../test/helpers.js'
import {
  createDepartment,
  generateTeacher,
  generateStudent,
  createClass,
} from '../../test/factories.js'

// Types
import type { CreateTeacherResponse, CreateStudentResponse } from './user.dto.js'

const api = request(app)

describe('/users', () => {
  describe('POST /users/teachers', () => {
    const ENDPOINT = '/users/teachers'

    it('succeeds with status 201 on correct data', async () => {
      const departmentId = (await createDepartment()).id
      const teacher = generateTeacher({ departmentId })

      const res = await api.post(ENDPOINT).send(teacher)
      const body = assertSuccessBody<CreateTeacherResponse>(res)

      const { password: _password, ...expectedCreateTeacherResponse } = teacher

      expect(res.status).toBe(201)
      expect(body.data).toMatchObject(expectedCreateTeacherResponse)
      expect(body.data).not.toHaveProperty('password')
      expect(body.data).not.toHaveProperty('passwordHash')
    })

    describe('Input validations', () => {
      it('fails with status 422 on invalid email or gender', async () => {
        const teacher = generateTeacher({
          personalEmail: 'incorrect.email',
          gender: 'invalid gender',
        })

        const res = await api.post(ENDPOINT).send(teacher)

        const body = assertErrorBody(res)

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')
        expect(body.error.details.length).toBe(2)

        const personalEmailFieldError = findFieldError(body.error.details, 'personalEmail')
        const genderFieldError = findFieldError(body.error.details, 'gender')

        expect(personalEmailFieldError).toBeDefined()
        expect(personalEmailFieldError?.code).toBe('invalid_format')

        expect(genderFieldError).toBeDefined()
        expect(genderFieldError?.code).toBe('invalid_value')
        expect(genderFieldError?.message).toContain('male')
        expect(genderFieldError?.message).toContain('female')
      })

      it('fails with status 422 if empty JSON body is provided', async () => {
        const res = await api.post(ENDPOINT).send({})

        const body = assertErrorBody(res)

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')
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
      it('fails with status 409 for duplicate personal email', async () => {
        const departmentId = (await createDepartment()).id

        const teacher1 = generateTeacher({
          personalEmail: 'duplicate@example.com',
          departmentId,
        })

        const teacher2 = generateTeacher({
          personalEmail: 'duplicate@example.com',
          departmentId,
        })

        await api.post(ENDPOINT).send(teacher1)
        const res = await api.post(ENDPOINT).send(teacher2)

        const body = assertErrorBody(res)

        expect(res.status).toBe(409)
        expect(body.error.type).toBe('CONFLICT')
        expect(body.error.message).toContain('personalEmail')
      })

      it('fails with status 409 for duplicate university email', async () => {
        const departmentId = (await createDepartment()).id

        const teacher1 = generateTeacher({
          universityEmail: 'duplicate@ntu.edu.pk',
          departmentId,
        })

        const teacher2 = generateTeacher({
          universityEmail: 'duplicate@ntu.edu.pk',
          departmentId,
        })

        await api.post(ENDPOINT).send(teacher1)
        const res = await api.post(ENDPOINT).send(teacher2)

        const body = assertErrorBody(res)

        expect(res.status).toBe(409)
        expect(body.error.type).toBe('CONFLICT')
        expect(body.error.message).toContain('universityEmail')
      })

      it.skip('succeeds with 201 with duplicate university email if previous holder is soft-deleted', () => true)

      it('fails with status 400 on invalid designation', async () => {
        const departmentId = (await createDepartment()).id
        const teacher = generateTeacher({
          designation: 'non-existent',
          departmentId,
        })

        const res = await api.post(ENDPOINT).send(teacher)

        const body = assertErrorBody(res)

        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('designation')
      })

      it('fails with status 400 on invalid departmentId', async () => {
        const res = await api.post(ENDPOINT).send(generateTeacher())

        const body = assertErrorBody(res)

        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('departmentId')
      })
    })
  })

  describe('POST /users/students', () => {
    const ENDPOINT = '/users/students'

    it('Succeeds with status 201 on correct data', async () => {
      const classPublicId = (await createClass()).publicId
      const student = generateStudent({ classPublicId })

      const res = await api.post(ENDPOINT).send(student)

      const body = assertSuccessBody<CreateStudentResponse>(res)

      // Remove password field from response
      const { password: _password, ...expectedCreateStudentResponse } = student

      expect(res.status).toBe(201)
      expect(body.data).toMatchObject(expectedCreateStudentResponse)
      expect(body.data).not.toHaveProperty('password')
      expect(body.data).not.toHaveProperty('passwordHash')
    })

    describe('Input validations', () => {
      it('fails with status 422 on invalid email or gender', async () => {
        const student = generateStudent({
          personalEmail: 'incorrect.email',
          gender: 'invalid gender',
        })

        const res = await api.post(ENDPOINT).send(student)

        const body = assertErrorBody(res)

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')
        expect(body.error.details.length).toBe(2)

        const personalEmailFieldError = findFieldError(body.error.details, 'personalEmail')
        const genderFieldError = findFieldError(body.error.details, 'gender')

        expect(personalEmailFieldError).toBeDefined()
        expect(personalEmailFieldError?.code).toBe('invalid_format')

        expect(genderFieldError).toBeDefined()
        expect(genderFieldError?.code).toBe('invalid_value')
        expect(genderFieldError?.message).toContain('male')
        expect(genderFieldError?.message).toContain('female')
      })

      it('fails with status 422 if empty JSON body is provided', async () => {
        const res = await api.post(ENDPOINT).send({})

        const body = assertErrorBody(res)
        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')
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
      it('fails with status 409 for duplicate personal email', async () => {
        const classPublicId = (await createClass()).publicId

        const student1 = generateStudent({
          personalEmail: 'duplicate@example.com',
          classPublicId,
        })

        const student2 = generateStudent({
          personalEmail: 'duplicate@example.com',
          classPublicId,
        })

        await api.post(ENDPOINT).send(student1)
        const res = await api.post(ENDPOINT).send(student2)

        const body = assertErrorBody(res)

        expect(res.status).toBe(409)
        expect(body.error.type).toBe('CONFLICT')
      })

      it('fails with status 409 for duplicate university email', async () => {
        const classPublicId = (await createClass()).publicId

        const student1 = generateStudent({
          universityEmail: 'duplicate@ntu.edu.pk',
          classPublicId,
        })

        const student2 = generateStudent({
          universityEmail: 'duplicate@ntu.edu.pk',
          classPublicId,
        })

        await api.post(ENDPOINT).send(student1)
        const res = await api.post(ENDPOINT).send(student2)

        const body = assertErrorBody(res)

        expect(res.status).toBe(409)
        expect(body.error.type).toBe('CONFLICT')
      })

      it.skip('succeeds with 201 with duplicate university email if previous holder is soft-deleted', () => true)

      it('fails with status 400 on invalid classPublicId', async () => {
        const res = await api.post(ENDPOINT).send(generateStudent())

        const body = assertErrorBody(res)

        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).includes('classPublicId')
      })

      it('fails with status 409 on duplicate roll number', async () => {
        const classPublicId = (await createClass()).publicId

        const student1 = generateStudent({
          rollNumber: '22-NTU-CS-1184',
          classPublicId,
        })

        const student2 = generateStudent({
          rollNumber: '22-NTU-CS-1184',
          classPublicId,
        })

        await api.post(ENDPOINT).send(student1)
        const res = await api.post(ENDPOINT).send(student2)

        const body = assertErrorBody(res)

        expect(res.status).toBe(409)
        expect(body.error.type).toBe('CONFLICT')
        expect(body.error.message).includes('rollNumber')
      })
    })
  })
})