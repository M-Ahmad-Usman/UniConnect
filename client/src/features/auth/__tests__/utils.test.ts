import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/types';
import { applyApiValidationErrors, getApiErrorMessage } from '../utils';

describe('getApiErrorMessage', () => {
  it('returns the message from an ApiError', () => {
    const error = new ApiError('TEST', 'Server error message', [], 400);
    expect(getApiErrorMessage(error)).toBe('Server error message');
  });

  it('returns the message from a generic Error', () => {
    expect(getApiErrorMessage(new Error('Oops'))).toBe('Oops');
  });

  it('returns the default fallback for unknown errors', () => {
    expect(getApiErrorMessage('string error')).toBe('Something went wrong. Please try again.');
  });

  it('returns a custom fallback when provided', () => {
    expect(getApiErrorMessage(42, 'Custom fallback')).toBe('Custom fallback');
  });

  it('keeps enriched backend messages for specific error codes', () => {
    const error = new ApiError(
      'CURRICULUM_TEACHER_ASSIGNMENT_REQUIRED',
      'Teacher assignments are required for all curriculum courses.',
      [],
      400,
      'req-12345678',
    );

    expect(getApiErrorMessage(error)).toBe(
      'Teacher assignments are required for all curriculum courses.',
    );
    expect(error.requestId).toBe('req-12345678');
  });
});

describe('applyApiValidationErrors', () => {
  it('applies field errors from an ApiError with details', () => {
    const error = new ApiError(
      'VALIDATION_ERROR',
      'Invalid',
      [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ],
      400,
    );

    const setError = vi.fn();
    const applied = applyApiValidationErrors(error, setError);

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Invalid email' });
    expect(setError).toHaveBeenCalledWith('password', { type: 'server', message: 'Too short' });
  });

  it('returns false for non-ApiError errors', () => {
    const setError = vi.fn();
    expect(applyApiValidationErrors(new Error('oops'), setError)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it('skips details with non-string field or message', () => {
    const error = new ApiError(
      'VALIDATION_ERROR',
      'Invalid',
      [
        { field: 123, message: 'bad' },
        { message: 'no field' },
        { field: 'email', message: 'Valid detail' },
      ],
      400,
    );

    const setError = vi.fn();
    const applied = applyApiValidationErrors(error, setError);

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Valid detail' });
  });

  it('returns false when ApiError has no applicable details', () => {
    const error = new ApiError('VALIDATION_ERROR', 'Invalid', [{ field: 123, message: 456 }], 400);

    const setError = vi.fn();
    expect(applyApiValidationErrors(error, setError)).toBe(false);
  });
});
