import { ApiError } from '@/types';

type ErrorCopy = {
  title: string;
  message: string;
  retryable: boolean;
};

const ERROR_COPY: Record<string, ErrorCopy> = {
  VALIDATION_ERROR: {
    title: 'Check the highlighted fields',
    message: 'Some information needs to be corrected before continuing.',
    retryable: false,
  },
  UNAUTHORIZED: {
    title: 'Sign in required',
    message: 'Your session has expired. Please sign in again.',
    retryable: false,
  },
  FORBIDDEN: {
    title: 'Permission required',
    message: 'You do not have permission to perform this action.',
    retryable: false,
  },
  SCOPE_FORBIDDEN: {
    title: 'Outside your scope',
    message: 'This action is outside the department, class, society, or server scope you can manage.',
    retryable: false,
  },
  PASSWORD_CHANGE_REQUIRED: {
    title: 'Password change required',
    message: 'Change your temporary password before continuing.',
    retryable: false,
  },
  NOT_FOUND: {
    title: 'Not found',
    message: 'The requested resource was not found or is not available to you.',
    retryable: false,
  },
  CONFLICT: {
    title: 'Conflict',
    message: 'This action conflicts with existing data.',
    retryable: false,
  },
  RATE_LIMIT_EXCEEDED: {
    title: 'Too many requests',
    message: 'Please wait before trying again.',
    retryable: true,
  },
  REQUEST_TIMEOUT: {
    title: 'Request timed out',
    message: 'The request took too long. Please try again.',
    retryable: true,
  },
  CSRF_INVALID: {
    title: 'Request protection failed',
    message: 'Request protection could not be verified. Please try again.',
    retryable: true,
  },
  INTERNAL_ERROR: {
    title: 'Something went wrong',
    message: 'An unexpected server error occurred. Please try again.',
    retryable: true,
  },
  DUPLICATE_EMAIL: {
    title: 'Email already exists',
    message: 'Use a different email address.',
    retryable: false,
  },
  DUPLICATE_DEPARTMENT_CODE: {
    title: 'Department code already exists',
    message: 'Use a different department code.',
    retryable: false,
  },
  DUPLICATE_PROGRAM_CODE: {
    title: 'Program code already exists',
    message: 'Use a different program code.',
    retryable: false,
  },
  DUPLICATE_COURSE_CODE: {
    title: 'Course code already exists',
    message: 'Use a different course code.',
    retryable: false,
  },
  DUPLICATE_SOCIETY_NAME: {
    title: 'Society name already exists',
    message: 'Use a different society name.',
    retryable: false,
  },
  DUPLICATE_ROLL_NUMBER: {
    title: 'Roll number already exists',
    message: 'Use a different student roll number.',
    retryable: false,
  },
  CLASS_GRADUATED: {
    title: 'Class is graduated',
    message: 'Graduated classes are read-only.',
    retryable: false,
  },
  SOCIETY_SUSPENDED: {
    title: 'Society suspended',
    message: 'Suspended societies are read-only.',
    retryable: false,
  },
  CLASS_FINAL_SEMESTER_REQUIRED: {
    title: 'Final semester required',
    message: 'Only final-semester classes can be graduated.',
    retryable: false,
  },
  CURRICULUM_TEACHER_ASSIGNMENT_REQUIRED: {
    title: 'Teacher assignments required',
    message: 'Assign teachers to all required curriculum courses before continuing.',
    retryable: false,
  },
  ALREADY_MEMBER: {
    title: 'Already a member',
    message: 'This user is already a member.',
    retryable: false,
  },
  JOIN_REQUEST_PENDING: {
    title: 'Request already pending',
    message: 'A join request is already waiting for review.',
    retryable: false,
  },
  CHANNEL_LOCKED: {
    title: 'Channel locked',
    message: 'This channel is locked and cannot accept this action.',
    retryable: false,
  },
  EDIT_WINDOW_EXPIRED: {
    title: 'Edit window expired',
    message: 'This post can no longer be edited.',
    retryable: false,
  },
  UPLOAD_FILE_TOO_LARGE: {
    title: 'File too large',
    message: 'Choose a smaller file and try again.',
    retryable: false,
  },
  UPLOAD_UNSUPPORTED_TYPE: {
    title: 'Unsupported file type',
    message: 'Choose a supported file type and try again.',
    retryable: false,
  },
  UPLOAD_IMAGE_TOO_LARGE: {
    title: 'Image dimensions too large',
    message: 'Choose an image with fewer pixels and try again.',
    retryable: false,
  },
};

const FALLBACK_COPY: ErrorCopy = {
  title: 'Something went wrong',
  message: 'An unexpected server error occurred. Please try again.',
  retryable: true,
};

export function getApiErrorCopy(error: unknown): ErrorCopy {
  if (error instanceof ApiError) {
    return ERROR_COPY[error.code] ?? FALLBACK_COPY;
  }

  return FALLBACK_COPY;
}

export function getDisplayErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (error instanceof ApiError) {
    return error.message || getApiErrorCopy(error).message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
