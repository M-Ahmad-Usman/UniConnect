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

describe('Program Module', () => {
  describe('POST /programs', () => {
    const ENDPOINT = '/programs'

    it('succeeds with status 201 on correct data', async () => {
      const { id: departmentId } = await createDepartment()
      const { publicId: directorPublicId } = await createTeacher({ teacherOverrides: { departmentId } })

      const program = generateProgram({ departmentId, directorPublicId })

      const res = await api.post(ENDPOINT).send(program).expect(201)
      const body = assertSuccessBody<CreateProgramResponse>(res)

      expect(body.data).toMatchObject(program)
    })

    describe('Input validations', () => {
      it('fails with status 422 on invalid totalSemesters or code', async () => {
        const { id: departmentId } = await createDepartment()
        const { publicId: directorPublicId } = await createTeacher({ teacherOverrides: { departmentId } })

        const program = generateProgram({
          departmentId,
          directorPublicId,
          totalSemesters: -1,
          code: 'a',
        })

        const res = await api.post(ENDPOINT).send(program).expect(422)
        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')

        const totalSemestersFieldError = findFieldError(body.error.details, 'totalSemesters')
        const codeFieldError = findFieldError(body.error.details, 'code')

        expect(totalSemestersFieldError?.code).toBe('too_small')
        expect(codeFieldError?.code).toBe('too_small')
      })

      it('fails with status 400 on invalid degreeLevel', async () => {
        const { id: departmentId } = await createDepartment()
        const { publicId: directorPublicId } = await createTeacher({ teacherOverrides: { departmentId } })

        const program = generateProgram({
          departmentId,
          directorPublicId,
          degreeLevel: 'incorrect',
        })

        const res = await api.post(ENDPOINT).send(program).expect(422)
        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')

        const degreeLevelFieldError = findFieldError(body.error.details, 'degreeLevel')

        expect(degreeLevelFieldError?.code).toBe('invalid_value')

        // Allowed values
        expect(degreeLevelFieldError?.message).toMatch('bachelors')
        expect(degreeLevelFieldError?.message).toMatch('masters')
        expect(degreeLevelFieldError?.message).toMatch('phd')
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
        const { publicId: directorPublicId } = await createTeacher()

        const program = generateProgram({ departmentId: 100, directorPublicId })

        const res = await api.post(ENDPOINT).send(program).expect(400)
        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('departmentId')
      })

      it('fails with status 400 on non-existent discipline', async () => {
        const { id: departmentId } = await createDepartment()
        const { publicId: directorPublicId } = await createTeacher({ teacherOverrides: { departmentId } })

        const program = generateProgram({
          departmentId,
          directorPublicId,
          discipline: 'incorrect',
        })

        const res = await api.post(ENDPOINT).send(program).expect(400)
        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('discipline')
      })

      it('fails with status 400 on non-existent programDirector', async () => {
        const { id: departmentId } = await createDepartment()

        const program = generateProgram({ departmentId })

        const res = await api.post(ENDPOINT).send(program).expect(400)
        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toContain('directorPublicId')
      })
    })
  })

  describe('POST /programs/curricula', () => {
    const ENDPOINT = '/programs/curricula'

    it('succeeds with status 201 on correct data', async () => {
      const { id: departmentId } = await createDepartment()
      const { id: programId } = await createProgram({ programOverrides: { totalSemesters: 4, departmentId } })
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
        .expect(201)

      const body = assertSuccessBody<CreateProgramCurriculaResponse>(res)

      expect(body.data[0]).toStrictEqual(curricula[0])
    })

    describe('Input validations', () => {
      it("fails with status 422 if curriculum isn't provided for all semesters", async () => {
        const { id: departmentId } = await createDepartment()
        const { id: programId } = await createProgram({ programOverrides: { totalSemesters: 4, departmentId } })
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
          .expect(422)

        const body = assertErrorBody(res)

        const curriculumFieldError = findFieldError(body.error.details, 'curricula.0')

        expect(body.error.type).toBe('VALIDATION_FAILED')

        expect(curriculumFieldError).toBeDefined()
        expect(curriculumFieldError?.message).toMatch(/semesters/i)
      })

      it('fails with status 422 if 2 curricula are provided for same batch', async () => {
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
          .expect(422)

        const body = assertErrorBody(res)

        const batchYearFieldError = findFieldError(body.error.details, 'curricula.1.batchYear')

        expect(body.error.type).toBe('VALIDATION_FAILED')

        expect(batchYearFieldError?.message).toMatch(/duplicate/i)
      })

      it('fails with status 422 if course assignment is duplicated in a batch', async () => {
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
          .expect(422)

        const body = assertErrorBody(res)

        const courseFieldError = findFieldError(body.error.details, 'curricula.0.semesterCourses.1.courseIds.0')

        expect(body.error.type).toBe('VALIDATION_FAILED')

        expect(courseFieldError?.message).toMatch(/duplicate/i)
      })

      it('fails with status 422 if duplicate 2 course assignments are provided for same semester', async () => {
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
          .expect(422)

        const body = assertErrorBody(res)

        const semesterFieldError = findFieldError(body.error.details, 'curricula.0.semesterCourses.1.semesterNumber')

        expect(body.error.type).toBe('VALIDATION_FAILED')

        expect(semesterFieldError?.message).toMatch(/duplicate/i)
      })

      it('fails with status 422 on invalid semesterNumber', async () => {
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
          .expect(422)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('VALIDATION_FAILED')

        const negativeSemesterNumberFieldError = findFieldError(body.error.details, 'curricula.0.semesterCourses.0.semesterNumber')
        const zeroSemesterNumberFieldError = findFieldError(body.error.details, 'curricula.0.semesterCourses.1.semesterNumber')


        expect(negativeSemesterNumberFieldError?.message).toMatch(/too small/i)
        expect(zeroSemesterNumberFieldError?.message).toMatch(/too small/i)
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
          .expect(400)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toMatch('programId')
      })

      it('fails with status 400 on non-existent courses', async () => {
        const { id: programId } = await createProgram({ programOverrides: { totalSemesters: 1 } })

        const curricula = [{
          batchYear: 2022,
          semesterCourses: [{ semesterNumber: 1, courseIds: [1] }],
        }]

        const res = await api.post(ENDPOINT).send({ programId, curricula }).expect(400)

        expect(res.status).toBe(400)

        const body = assertErrorBody(res)

        expect(body.error.type).toBe('BAD_REQUEST')
        expect(body.error.message).toMatch('courseId')
      })
    })
  })
})