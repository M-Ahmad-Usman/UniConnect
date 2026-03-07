import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/types';

interface ValidationDetail {
  field?: unknown;
  message?: unknown;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function applyApiValidationErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  let applied = false;

  for (const detail of error.details as ValidationDetail[]) {
    if (typeof detail.field !== 'string' || typeof detail.message !== 'string') {
      continue;
    }

    setError(detail.field as Path<TFieldValues>, {
      type: 'server',
      message: detail.message,
    });
    applied = true;
  }

  return applied;
}
