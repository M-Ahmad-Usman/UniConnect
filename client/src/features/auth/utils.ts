import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/types';
import { getDisplayErrorMessage } from '@/lib/api-error';

interface ValidationDetail {
  field?: unknown;
  message?: unknown;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  return getDisplayErrorMessage(error, fallback);
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
