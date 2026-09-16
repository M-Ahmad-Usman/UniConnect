
import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  InternalServerError,
  UnauthenticatedError,
  InvalidContentTypeError,
} from './AppError.js'
import type { FieldError } from '../types/api.js'

describe('App Error', () => {
  describe('Base Class', () => {
    it('should be child of Error', () => {
      const appError = new AppError({
        message: 'Something failed',
        statusCode: 500,
        type: 'INTERNAL_SERVER_ERROR',
      })

      expect(appError).toBeInstanceOf(Error)
    })

    it('should set isOperational to true by default', () => {
      const appError = new AppError({
        message: 'malformed input',
        statusCode: 400,
        type: 'BAD_REQUEST',
      })

      expect(appError.isOperational).toBe(true)
    })

    it('should have a stack trace', () => {
      const appError = new AppError({
        message: 'malformed input',
        statusCode: 400,
        type: 'BAD_REQUEST',
      })

      // Stack traces are critical for debugging production issues.
      expect(appError.stack).toBeDefined()
    })

    it('should preserve original cause if provided', () => {
      const cause = new Error('Original cause')
      const appError = new AppError({
        message: 'Something went wrong',
        statusCode: 500,
        type: 'INTERNAL_SERVER_ERROR',
        cause,
      })

      expect(appError.cause).toMatchObject(cause)
    })
  })

  describe('Sub Classes', () => {
    describe('NotFoundError', () => {
      it('should have correct HTTP semantics', () => {
        const notFoundError = new NotFoundError()

        expect(notFoundError.statusCode).toBe(404)
        expect(notFoundError.type).toBe('NOT_FOUND')
        expect(notFoundError.isOperational).toBe(true)
      })

      it('should be an instance of AppError', () => {
        const notFoundError = new NotFoundError()

        expect(notFoundError).toBeInstanceOf(AppError)
      })

      it('should preserve original cause if provided', () => {
        const cause = new Error('Original cause')
        const notFoundError = new NotFoundError('', cause)

        expect(notFoundError.cause).toMatchObject(cause)
      })
    })

    describe('BadRequestError', () => {
      it('should have correct HTTP semantics', () => {
        const badRequestError = new BadRequestError()

        expect(badRequestError.statusCode).toBe(400)
        expect(badRequestError.type).toBe('BAD_REQUEST')
        expect(badRequestError.isOperational).toBe(true)
      })

      it('should be an instance of AppError', () => {
        const badRequestError = new BadRequestError()

        expect(badRequestError).toBeInstanceOf(AppError)
      })

      it('should preserve original cause if provided', () => {
        const cause = new Error('Original cause')
        const badRequestError = new BadRequestError('', cause)

        expect(badRequestError.cause).toMatchObject(cause)
      })
    })

    describe('UnauthenticatedError', () => {
      it('should have correct HTTP semantics', () => {
        const unauthenticatedError = new UnauthenticatedError()

        expect(unauthenticatedError.statusCode).toBe(401)
        expect(unauthenticatedError.type).toBe('UNAUTHENTICATED')
        expect(unauthenticatedError.isOperational).toBe(true)
      })

      it('should be an instance of AppError', () => {
        const unauthenticatedError = new UnauthenticatedError()

        expect(unauthenticatedError).toBeInstanceOf(AppError)
      })

      it('should preserve original cause if provided', () => {
        const cause = new Error('Original cause')
        const unauthenticatedError = new UnauthenticatedError('', cause)

        expect(unauthenticatedError.cause).toMatchObject(cause)
      })
    })

    describe('ForbiddenError', () => {
      it('should have correct HTTP semantics', () => {
        const forbiddenError = new ForbiddenError()

        expect(forbiddenError.statusCode).toBe(403)
        expect(forbiddenError.type).toBe('FORBIDDEN')
        expect(forbiddenError.isOperational).toBe(true)
      })

      it('should be an instance of AppError', () => {
        const forbiddenError = new ForbiddenError()

        expect(forbiddenError).toBeInstanceOf(AppError)
      })

      it('should preserve original cause if provided', () => {
        const cause = new Error('Original cause')
        const forbiddenError = new ForbiddenError('', cause)

        expect(forbiddenError.cause).toMatchObject(cause)
      })
    })

    describe('ConflictError', () => {
      it('should have correct HTTP semantics', () => {
        const conflictError = new ConflictError()

        expect(conflictError.statusCode).toBe(409)
        expect(conflictError.type).toBe('CONFLICT')
        expect(conflictError.isOperational).toBe(true)
      })

      it('should be an instance of AppError', () => {
        const conflictError = new ConflictError()

        expect(conflictError).toBeInstanceOf(AppError)
      })

      it('should preserve original cause if provided', () => {
        const cause = new Error('Original cause')
        const conflictError = new ConflictError('', cause)

        expect(conflictError.cause).toMatchObject(cause)
      })
    })

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
        expect(validationError.details).toBe(fieldErrors)
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

      it('should be an instance of AppError', () => {
        const fieldErrors: FieldError[] = [{
          field: 'user.age',
          message: 'age cannot be negative',
          code: 'too_small',
        }]

        const validationError = new ValidationError(fieldErrors)

        expect(validationError).toBeInstanceOf(AppError)
      })

      it('should preserve original cause if provided', () => {
        const cause = new Error('Original cause')
        const validationError = new ValidationError([], '', cause)

        expect(validationError.cause).toMatchObject(cause)
      })
    })

    describe('InvalidContentTypeError', () => {
      it('should have correct HTTP semantics', () => {
        const invalidContentTypeError = new InvalidContentTypeError('require application/json, got text/html instead')

        expect(invalidContentTypeError.statusCode).toBe(415)
        expect(invalidContentTypeError.type).toBe('INVALID_CONTENT_TYPE')
        expect(invalidContentTypeError.isOperational).toBe(true)
      })

      it('should be an instance of AppError', () => {
        const invalidContentTypeError = new InvalidContentTypeError('application/json')

        expect(invalidContentTypeError).toBeInstanceOf(AppError)
      })

      it('should preserve original cause if provided', () => {
        const cause = new Error('Original cause')
        const invalidContentTypeError = new InvalidContentTypeError('', cause)

        expect(invalidContentTypeError.cause).toMatchObject(cause)
      })
    })

    describe('InteralServerError', () => {
      it('should preserve original cause if provided', () => {
        const cause = new Error('Original cause')
        const internalServerError = new InternalServerError('', cause)

        expect(internalServerError.cause).toMatchObject(cause)
      })

      it('should have correct HTTP semantics', () => {
        const internalServerError = new InternalServerError('', '')

        expect(internalServerError.statusCode).toBe(500)
        expect(internalServerError.type).toBe('INTERNAL_SERVER_ERROR')
      })

      it('should set isOperational to false', () => {
        const internalServerError = new InternalServerError('', '')

        expect(internalServerError.isOperational).toBe(false)
      })

      it('should be an instance of AppError', () => {
        const internalServerError = new InternalServerError('', '')

        expect(internalServerError).toBeInstanceOf(AppError)
      })
    })
  })
})