import { z } from 'zod';
import { Gender, UserType } from '@/types';

const numericIdSchema = z.number().int().positive('Select a valid option');
const optionalNumericIdSchema = z
  .string()
  .transform((value) => (value === '' ? undefined : Number(value)))
  .pipe(numericIdSchema.optional());
const rollNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{2}-NTU-[A-Z]{2,5}-\d{3,5}$/, 'Use NTU format, e.g. 22-NTU-CS-1184');

const baseUserFields = {
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .max(20, 'Phone must be at most 20 characters'),
  gender: z.enum([Gender.MALE, Gender.FEMALE], 'Select a gender'),
};

export const createUserSchema = z
  .object({
    ...baseUserFields,
    userType: z.enum([UserType.ADMIN, UserType.TEACHER, UserType.STUDENT]),
    departmentId: optionalNumericIdSchema,
    programId: optionalNumericIdSchema,
    classId: optionalNumericIdSchema,
    rollNumber: z.string().trim().toUpperCase(),
    designation: z.string().trim().max(100),
  })
  .superRefine((values, context) => {
    if (values.userType === UserType.ADMIN) {
      return;
    }

    if (!values.departmentId) {
      context.addIssue({
        code: 'custom',
        path: ['departmentId'],
        message: 'Select a department',
      });
    }

    if (values.userType === UserType.TEACHER && !values.designation?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['designation'],
        message: 'Designation is required',
      });
    }

    if (values.userType === UserType.STUDENT) {
      if (!values.programId) {
        context.addIssue({ code: 'custom', path: ['programId'], message: 'Select a program' });
      }
      if (!values.classId) {
        context.addIssue({ code: 'custom', path: ['classId'], message: 'Select a class' });
      }
      const parsedRollNumber = rollNumberSchema.safeParse(values.rollNumber ?? '');
      if (!parsedRollNumber.success) {
        context.addIssue({
          code: 'custom',
          path: ['rollNumber'],
          message: parsedRollNumber.error.issues[0]?.message ?? 'Enter a valid roll number',
        });
      }
    }
  });

export interface CreateUserFormInput {
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  userType: UserType;
  departmentId: string;
  programId: string;
  classId: string;
  rollNumber: string;
  designation: string;
}

export type CreateUserFormValues = z.output<typeof createUserSchema>;

export function toCreateUserPayload(values: CreateUserFormValues) {
  const base = {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    gender: values.gender,
    userType: values.userType,
  };

  if (values.userType === UserType.ADMIN) {
    return base;
  }

  if (values.userType === UserType.TEACHER) {
    return {
      ...base,
      departmentId: values.departmentId!,
      designation: values.designation!.trim(),
    };
  }

  return {
    ...base,
    departmentId: values.departmentId!,
    classId: values.classId!,
    rollNumber: values.rollNumber!.trim().toUpperCase(),
  };
}

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
