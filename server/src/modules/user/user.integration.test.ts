import { describe, it, expect } from 'vitest'
import request from 'supertest'

import app from '../../app.js'

// Utils
import * as testFactory from '../../test/factories.js'
import * as testHelper from '../../test/helpers.js'

// Types
import type { TeacherResponse } from './user.dto.js'

const api = request(app)

describe('/users', () => {
  describe('POST /users/teachers', () => {
    const ENDPOINT = '/users/teachers'

    it('succeeds with status 201 on correct data', async () => {
      const teacherDepartment = await testFactory.createDepartment()

      const res = await api.post(ENDPOINT)
        .send(testFactory.generateTeacher({
          fullName: 'Muhammad Ahmad',
          departmentId: teacherDepartment.id,
        }))

      const body = testHelper.assertSuccessBody<TeacherResponse>(res)

      expect(res.status).toBe(201)
      expect(body.data).toMatchObject({ fullName: 'Muhammad Ahmad' })
    })

    describe('Input validations', () => {
      it('fails with status 422 on invalid email or gender', async () => {
        const res = await api.post(ENDPOINT)
          .send(testFactory.generateTeacher({ personalEmail: 'incorrect.email', gender: 'invalid gender' }))

        const body = testHelper.assertErrorBody(res)
        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        // Destructure details before asserting Non Nullability
        // If we pass body.error.details to testHelper.assertDefined
        // then any subsequent function call would re-widen the
        // details type to <FieldError[] | undefined>
        const { details } = body.error
        testHelper.expectDefined(details)

        // Assertion is required here to satisfy noUncheckedIndexedAccess rule
        const personalEmailFieldError = details.find(fieldError => fieldError.field === 'personalEmail')
        const genderFieldError = details.find(fieldError => fieldError.field === 'gender')

        testHelper.expectDefined(personalEmailFieldError)
        testHelper.expectDefined(genderFieldError)

        expect(personalEmailFieldError.code).toBe('invalid_format')

        expect(genderFieldError.code).toBe('invalid_value')
        expect(genderFieldError.message).includes('male')
        expect(genderFieldError.message).includes('female')

        expect(details.length).toBe(2)
      })
    })

    describe('DB dependent validations', () => {
      it('fails with status 409 for duplicate personal email', async () => {
        const teacherDepartment = await testFactory.createDepartment()

        await api.post(ENDPOINT)
          .send(testFactory.generateTeacher({ personalEmail: 'duplicate@example.com', departmentId: teacherDepartment.id }))
        const res = await api.post(ENDPOINT)
          .send(testFactory.generateTeacher({ personalEmail: 'duplicate@example.com', departmentId: teacherDepartment.id }))

        const body = testHelper.assertErrorBody(res)
        expect(res.status).toBe(409)
        expect(body.error.type).toBe('CONFLICT')
      })

      it('fails with status 409 for duplicate university email', async () => {
        const teacherDepartment = await testFactory.createDepartment()

        await api.post(ENDPOINT)
          .send(testFactory.generateTeacher({ universityEmail: 'duplicate@ntu.edu.pk', departmentId: teacherDepartment.id }))
        const res = await api.post(ENDPOINT)
          .send(testFactory.generateTeacher({ universityEmail: 'duplicate@ntu.edu.pk', departmentId: teacherDepartment.id }))

        const body = testHelper.assertErrorBody(res)
        expect(res.status).toBe(409)
        expect(body.error.type).toBe('CONFLICT')
      })

      it.skip('succeeds with 201 with duplicate university email if previous holder is soft-deleted', () => true)

      it('fails with status 400 on invalid designation', async () => {
        const teacherDepartment = await testFactory.createDepartment()

        const res = await api.post(ENDPOINT)
          .send(testFactory.generateTeacher({ designation: 'non-existent', departmentId: teacherDepartment.id }))

        const body = testHelper.assertErrorBody(res)

        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).includes('designation')
      })

      it('fails with status 400 on invalid departmentId', async () => {
        const res = await api.post(ENDPOINT)
          .send(testFactory.generateTeacher({ departmentId: 1 }))

        const body = testHelper.assertErrorBody(res)
        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).includes('departmentId')
      })
    })
  })
})