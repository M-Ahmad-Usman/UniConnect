import { z } from 'zod';
import { Gender } from '@/types';

const requiredNumericIdSchema = z.coerce.number().int().positive('Select a valid option');
const requiredPublicIdSchema = z.string().uuid('Select a valid class');
const rollNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{2}-NTU-[A-Z]{2,5}-\d{3,5}$/, 'Use NTU format, e.g. 22-NTU-CS-1184');

export const enrollmentClassSchema = z.object({
  programId: requiredNumericIdSchema,
  currentSemester: z.coerce.number().int().min(1, 'Minimum is 1').max(10, 'Maximum is 10'),
  academicYear: z.coerce.number().int().min(2000, 'Invalid year').max(2100, 'Invalid year'),
  admissionYear: z.coerce.number().int().min(2000, 'Invalid year').max(2100, 'Invalid year'),
  section: z.enum(['A', 'B'], 'Select a section'),
});

export const enrollmentStudentSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.email('Enter a valid email address'),
  phone: z.string().trim().min(1, 'Phone is required').max(20),
  gender: z.enum([Gender.MALE, Gender.FEMALE], 'Select a gender'),
  classPublicId: requiredPublicIdSchema,
  rollNumber: rollNumberSchema,
});

export const enrollmentStudentFormSchema = enrollmentStudentSchema.extend({
  departmentId: z.string(),
  programId: z.string(),
});

export const transferStudentSchema = z.object({
  studentPublicId: requiredPublicIdSchema,
});

export const csvImportRules = {
  maxSize: 5 * 1024 * 1024,
  allowedTypes: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
} as const;

export function validateCsvFile(file: File) {
  const hasCsvExtension = file.name.toLowerCase().endsWith('.csv');
  if (!hasCsvExtension && !(csvImportRules.allowedTypes as readonly string[]).includes(file.type)) {
    return 'Upload a CSV file.';
  }

  if (file.size > csvImportRules.maxSize) {
    return 'CSV file must be 5 MB or smaller.';
  }

  return null;
}

export type EnrollmentClassFormValues = z.output<typeof enrollmentClassSchema>;
export type EnrollmentClassFormInput = z.input<typeof enrollmentClassSchema>;
export type EnrollmentStudentFormValues = z.output<typeof enrollmentStudentSchema>;
export type EnrollmentStudentFormInput = z.input<typeof enrollmentStudentFormSchema>;
export type EnrollmentStudentUiFormValues = z.output<typeof enrollmentStudentFormSchema>;
export type TransferStudentFormValues = z.output<typeof transferStudentSchema>;
