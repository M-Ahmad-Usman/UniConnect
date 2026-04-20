
import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  InternalServerError,
  UnauthorizedError,
} from './AppError.js'
import type { FieldError } from '../types/api.js'

describe('App Error', () => {
  describe('Base Class', () => {
    // AppError
    describe('AppError', () => {
      it('should be an instance of both Error and AppError', () => {
        const error = new AppError('Something failed', 500, 'INTERNAL_SERVER_ERROR', false)

        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(AppError)
      })

      it('should store all constructor arguments as readable properties', () => {
        const error = new AppError('Something failed', 500, 'INTERNAL_SERVER_ERROR', false)

        expect(error.message).toBe('Something failed')
        expect(error.statusCode).toBe(500)
        expect(error.type).toBe('INTERNAL_SERVER_ERROR')
        expect(error.isOperational).toBe(false)
      })

      it('should default isOperational to true', () => {
        const error = new AppError('malformed input', 400, 'BAD_REQUEST')

        expect(error.isOperational).toBe(true)
      })

      it('should have a stack trace', () => {
        const error = new AppError('malformed input', 400, 'BAD_REQUEST')

        // Stack traces are critical for debugging production issues.
        expect(error.stack).toBeDefined()
      })
    })
  })

  describe('Sub Classes', () => {
    // NotFoundError
    describe('NotFoundError', () => {
      it('should have correct HTTP semantics', () => {
        const notFoundError = new NotFoundError()

        expect(notFoundError.statusCode).toBe(404)
        expect(notFoundError.type).toBe('NOT_FOUND')
        expect(notFoundError.isOperational).toBe(true)
      })

      it('should use the default message when none is provided', () => {
        const notFoundError = new NotFoundError()

        // toBeTruthy also validates empty strings
        expect(notFoundError.message).toBeTruthy()
      })

      it('should use a custom message when provided', () => {
        const notFoundError = new NotFoundError('custom message')

        expect(notFoundError.message).toBe('custom message')
      })

      it('should be an instance of AppError and Error', () => {
        const notFoundError = new NotFoundError()

        expect(notFoundError).toBeInstanceOf(AppError)
        expect(notFoundError).toBeInstanceOf(Error)
      })
    })

    // BadRequestError
    describe('BadRequestError', () => {
      it('should have correct HTTP semantics', () => {
        const badRequestError = new BadRequestError()

        expect(badRequestError.statusCode).toBe(400)
        expect(badRequestError.type).toBe('BAD_REQUEST')
        expect(badRequestError.isOperational).toBe(true)
      })

      it('should use the default message when none is provided', () => {
        const badRequestError = new BadRequestError()

        // toBeTruthy also validates empty strings
        expect(badRequestError.message).toBeTruthy()
      })

      it('should use a custom message when provided', () => {
        const badRequestError = new BadRequestError('custom message')

        expect(badRequestError.message).toBe('custom message')
      })

      it('should be an instance of AppError and Error', () => {
        const badRequestError = new BadRequestError()

        expect(badRequestError).toBeInstanceOf(AppError)
        expect(badRequestError).toBeInstanceOf(Error)
      })
    })

    // UnauthorizedError
    describe('UnauthorizedError', () => {
      it('should have correct HTTP semantics', () => {
        const unauthorizedError = new UnauthorizedError()

        expect(unauthorizedError.statusCode).toBe(401)
        expect(unauthorizedError.type).toBe('UNAUTHORIZED')
        expect(unauthorizedError.isOperational).toBe(true)
      })

      it('should use the default message when none is provided', () => {
        const unauthorizedError = new UnauthorizedError()

        // toBeTruthy also validates empty strings
        expect(unauthorizedError.message).toBeTruthy()
      })

      it('should use a custom message when provided', () => {
        const unauthorizedError = new UnauthorizedError('custom message')

        expect(unauthorizedError.message).toBe('custom message')
      })

      it('should be an instance of AppError and Error', () => {
        const unauthorizedError = new UnauthorizedError()

        expect(unauthorizedError).toBeInstanceOf(AppError)
        expect(unauthorizedError).toBeInstanceOf(Error)
      })
    })

    // ForbiddenError
    describe('ForbiddenError', () => {
      it('should have correct HTTP semantics', () => {
        const forbiddenError = new ForbiddenError()

        expect(forbiddenError.statusCode).toBe(403)
        expect(forbiddenError.type).toBe('FORBIDDEN')
        expect(forbiddenError.isOperational).toBe(true)
      })

      it('should use the default message when none is provided', () => {
        const forbiddenError = new ForbiddenError()

        // toBeTruthy also validates empty strings
        expect(forbiddenError.message).toBeTruthy()
      })

      it('should use a custom message when provided', () => {
        const forbiddenError = new ForbiddenError('custom message')

        expect(forbiddenError.message).toBe('custom message')
      })

      it('should be an instance of AppError and Error', () => {
        const forbiddenError = new ForbiddenError()

        expect(forbiddenError).toBeInstanceOf(AppError)
        expect(forbiddenError).toBeInstanceOf(Error)
      })
    })

    // ConflictError
    describe('ConflictError', () => {
      it('should have correct HTTP semantics', () => {
        const conflictError = new ConflictError()

        expect(conflictError.statusCode).toBe(409)
        expect(conflictError.type).toBe('CONFLICT')
        expect(conflictError.isOperational).toBe(true)
      })

      it('should use the default message when none is provided', () => {
        const conflictError = new ConflictError()

        // toBeTruthy also validates empty strings
        expect(conflictError.message).toBeTruthy()
      })

      it('should use a custom message when provided', () => {
        const conflictError = new ConflictError('custom message')

        expect(conflictError.message).toBe('custom message')
      })

      it('should be an instance of AppError and Error', () => {
        const conflictError = new ConflictError()

        expect(conflictError).toBeInstanceOf(AppError)
        expect(conflictError).toBeInstanceOf(Error)
      })
    })

    // ValidationError
    describe('ValidationError', () => {
      it('should have correct HTTP semantics', () => {
        const fieldErrors: FieldError[] = [{
          field: 'user.age',
          message: 'age cannot be negative',
          code: 'too_small',
        }]

        const validationError = new ValidationError(fieldErrors)

        expect(validationError.statusCode).toBe(422)
        expect(validationError.type).toBe('VALIDATION_FAILED')
        expect(validationError.isOperational).toBe(true)
      })

      it('should store and expose field level details', () => {
        const fieldErrors: FieldError[] = [{
          field: 'user.age',
          message: 'age cannot be negative',
          code: 'too_small',
        }]
        const validationError = new ValidationError(fieldErrors)

        expect(validationError.details).toBe(fieldErrors)
      })

      it('should use the default message when none is provided', () => {
        const fieldErrors: FieldError[] = [{
          field: 'user.age',
          message: 'age cannot be negative',
          code: 'too_small',
        }]

        const validationError = new ValidationError(fieldErrors)

        // toBeTruthy also validates empty strings
        expect(validationError.message).toBeTruthy()
      })

      it('should use a custom message when provided', () => {
        const fieldErrors: FieldError[] = [{
          field: 'user.age',
          message: 'age cannot be negative',
          code: 'too_small',
        }]

        const validationError = new ValidationError(fieldErrors, 'custom message')

        expect(validationError.message).toBe('custom message')
      })

      it('should be an instance of AppError and Error', () => {
        const fieldErrors: FieldError[] = [{
          field: 'user.age',
          message: 'age cannot be negative',
          code: 'too_small',
        }]

        const validationError = new ValidationError(fieldErrors)

        expect(validationError).toBeInstanceOf(AppError)
        expect(validationError).toBeInstanceOf(Error)
      })
    })

    // InteralServerError
    describe('InteralServerError', () => {
      it('should have correct HTTP semantics', () => {
        const internalServerError = new InternalServerError()

        expect(internalServerError.statusCode).toBe(500)
        expect(internalServerError.type).toBe('INTERNAL_SERVER_ERROR')
      })

      it('should set isOperational to false', () => {
        const internalServerError = new InternalServerError()

        expect(internalServerError.isOperational).toBe(false)
      })

      it('should use the default message when none is provided', () => {
        const internalServerError = new InternalServerError()

        // toBeTruthy also validates empty strings
        expect(internalServerError.message).toBeTruthy()
      })

      it('should use a custom message when provided', () => {
        const internalServerError = new InternalServerError('custom message')

        expect(internalServerError.message).toBe('custom message')
      })

      it('should be an instance of AppError and Error', () => {
        const internalServerError = new InternalServerError()

        expect(internalServerError).toBeInstanceOf(AppError)
        expect(internalServerError).toBeInstanceOf(Error)
      })
    })
  })
})