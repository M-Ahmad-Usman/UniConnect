import { describe, it, expect } from 'vitest'
import request from 'supertest'

import app from '../../app.js'

// DTOs
import type { CreateProgramResponse, CreateProgramCurriculaResponse } from './program.dto.js'

// Utils
import {
  createDepartment,
  createTeacher,
  createProgram,
  generateProgram,
  createCourse,
} from '../../test/factories.js'
import {
  assertErrorBody,
  assertSuccessBody,
  findFieldError,
} from '../../test/helpers.js'

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
          code: 'a',
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
          degreeLevel: 'incorrect',
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
          discipline: 'incorrect',
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

  describe('POST /programs/curricula', () => {
    const ENDPOINT = '/programs/curricula'

    it('succeeds with status 201 on correct data', async () => {
      const departmentId = (await createDepartment()).id
      const programId = (await createProgram({ programOverrides: { totalSemesters: 4, departmentId } })).id
      const courseIds = (await Promise.all([
        createCourse({ courseOverrides: { departmentId } }),
        createCourse({ courseOverrides: { departmentId } }),
        createCourse({ courseOverrides: { departmentId } }),
        createCourse({ courseOverrides: { departmentId } }),
      ])).map(course => course.id)

      const curricula = [
        {
          batchYear: 2022,
          semesterCourses: [
            { semesterNumber: 1, courseIds: [courseIds[0]] },
            { semesterNumber: 2, courseIds: [courseIds[1]] },
            { semesterNumber: 3, courseIds: [courseIds[2]] },
            { semesterNumber: 4, courseIds: [courseIds[3]] },
          ],
        },
      ]

      const res = await api.post(ENDPOINT)
        .send({ programId, curricula })

      const body = assertSuccessBody<CreateProgramCurriculaResponse>(res)

      expect(res.status).toBe(201)
      expect(body.data[0]).toStrictEqual(curricula[0])
    })

    describe('Input validations', () => {
      it("fails with status 422 if curriculum isn't provided for all semesters", async () => {
        const departmentId = (await createDepartment()).id
        const programId = (await createProgram({ programOverrides: { totalSemesters: 4, departmentId } })).id
        const courseIds = (await Promise.all([
          createCourse({ courseOverrides: { departmentId } }),
          createCourse({ courseOverrides: { departmentId } }),
          createCourse({ courseOverrides: { departmentId } }),
        ])).map(course => course.id)

        const curriculum = {
          batchYear: 2022,
          semesterCourses: [
            { semesterNumber: 1, courseIds: [courseIds[0]] },
            { semesterNumber: 2, courseIds: [courseIds[1]] },
            { semesterNumber: 3, courseIds: [courseIds[2]] },
          ],
        }

        const res = await api.post(ENDPOINT)
          .send({ programId, curricula: [curriculum] })

        const body = assertErrorBody(res)

        const curriculumFieldError = findFieldError(body.error.details, 'curricula.0')

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        expect(curriculumFieldError).toBeDefined()
        expect(curriculumFieldError?.message).toMatch(/semesters/i)
      })

      it('fails with status 422 if duplicate batchYear is provided for curricula', async () => {
        const curricula = [
          {
            batchYear: 2022,
            semesterCourses: [
              { semesterNumber: 1, courseIds: [1] },
              { semesterNumber: 2, courseIds: [2] },
              { semesterNumber: 3, courseIds: [3] },
            ],
          },
          {
            batchYear: 2022,
            semesterCourses: [
              { semesterNumber: 1, courseIds: [1] },
              { semesterNumber: 2, courseIds: [2] },
              { semesterNumber: 3, courseIds: [3] },
            ],
          },
        ]

        const res = await api.post(ENDPOINT)
          .send({ programId: 1, curricula: curricula })

        const body = assertErrorBody(res)

        const batchYearFieldError = findFieldError(body.error.details, 'curricula.1.batchYear')

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        expect(batchYearFieldError).toBeDefined()
        expect(batchYearFieldError?.message).toMatch(/duplicate/i)
      })

      it('fails with status 422 if duplicate course is specified within a batch', async () => {
        const curricula = [
          {
            batchYear: 2022,
            semesterCourses: [
              { semesterNumber: 1, courseIds: [1] },
              { semesterNumber: 2, courseIds: [1,2] },
              { semesterNumber: 3, courseIds: [3] },
            ],
          },
        ]

        const res = await api.post(ENDPOINT)
          .send({ programId: 1, curricula: curricula })

        const body = assertErrorBody(res)

        const courseFieldError = findFieldError(body.error.details, 'curricula.0.semesterCourses.1.courseIds.0')

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        expect(courseFieldError).toBeDefined()
        expect(courseFieldError?.message).toMatch(/duplicate/i)
      })

      it('fails with status 422 if duplicate semester is specified within a batch', async () => {
        const curricula = [
          {
            batchYear: 2022,
            semesterCourses: [
              { semesterNumber: 1, courseIds: [1] },
              { semesterNumber: 1, courseIds: [2] },
              { semesterNumber: 3, courseIds: [3] },
            ],
          },
        ]

        const res = await api.post(ENDPOINT)
          .send({ programId: 1, curricula: curricula })

        const body = assertErrorBody(res)

        const semesterFieldError = findFieldError(body.error.details, 'curricula.0.semesterCourses.1.semesterNumber')

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        expect(semesterFieldError).toBeDefined()
        expect(semesterFieldError?.message).toMatch(/duplicate/i)
      })

      it('fails with status 422 if invalid semesterNumber is provided', async () => {
        const curricula = [
          {
            batchYear: 2022,
            semesterCourses: [
              { semesterNumber: -1, courseIds: [1] },
              { semesterNumber: 0, courseIds: [2] },
              { semesterNumber: 1, courseIds: [3] },
            ],
          },
        ]

        const res = await api.post(ENDPOINT)
          .send({ programId: 1, curricula: curricula })

        const body = assertErrorBody(res)

        const negativeSemesterNumberFieldError = findFieldError(body.error.details, 'curricula.0.semesterCourses.0.semesterNumber')
        const zeroSemesterNumberFieldError = findFieldError(body.error.details, 'curricula.0.semesterCourses.1.semesterNumber')

        expect(res.status).toBe(422)
        expect(body.error.type).toBe('VALIDATION_FAILED')

        expect(negativeSemesterNumberFieldError).toBeDefined()
        expect(negativeSemesterNumberFieldError?.message).toMatch(/too small/i)

        expect(zeroSemesterNumberFieldError).toBeDefined()
        expect(zeroSemesterNumberFieldError?.message).toMatch(/too small/i)
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
      it('fails with status 400 on invalid programId', async () => {
        const curricula = [
          {
            batchYear: 2022,
            semesterCourses: [
              { semesterNumber: 1, courseIds: [1] },
              { semesterNumber: 2, courseIds: [2] },
              { semesterNumber: 3, courseIds: [3] },
            ],
          },
        ]

        const res = await api.post(ENDPOINT)
          .send({ programId: 1, curricula: curricula })

        const body = assertErrorBody(res)

        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toMatch('programId')
      })

      it('fails with status 400 on invalud courseIds', async () => {
        const programId = (await createProgram({ programOverrides: { totalSemesters: 1 } })).id

        const curricula = [{
          batchYear: 2022,
          semesterCourses: [{ semesterNumber: 1, courseIds: [1] }],
        }]

        const res = await api.post(ENDPOINT).send({ programId, curricula })

        const body = assertErrorBody(res)

        expect(res.status).toBe(400)
        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toMatch('courseId')
      })
    })
  })
})