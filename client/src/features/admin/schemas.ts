import { z } from 'zod';
import { Gender, UserType } from '@/types';
import type { CreatableUserType } from '@/types';

const numericIdSchema = z.number().int().positive('Select a valid option');
const requiredNumericIdSchema = z.coerce.number().int().positive('Select a valid option');
const optionalNumericIdSchema = z
  .string()
  .transform((value) => (value === '' ? undefined : Number(value)))
  .pipe(numericIdSchema.optional());
const requiredPublicIdSchema = z.string().uuid('Select a valid option');
const optionalPublicIdSchema = z.string().transform((value) => value || undefined).pipe(requiredPublicIdSchema.optional());
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
    userType: z.enum([UserType.TEACHER, UserType.STUDENT]),
    departmentId: optionalNumericIdSchema,
    programId: optionalNumericIdSchema,
    classPublicId: optionalPublicIdSchema,
    rollNumber: z.string().trim().toUpperCase(),
    designation: z.string().trim().max(100),
  })
  .superRefine((values, context) => {
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
      if (!values.classPublicId) {
        context.addIssue({ code: 'custom', path: ['classPublicId'], message: 'Select a class' });
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
  userType: CreatableUserType;
  departmentId: string;
  programId: string;
  classPublicId: string;
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
    classPublicId: values.classPublicId!,
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

const shortCodeSchema = z
  .string()
  .trim()
  .min(1, 'Code is required')
  .max(20, 'Code must be at most 20 characters')
  .transform((value) => value.toUpperCase());

export const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  code: shortCodeSchema,
});

export const disciplineSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
});

export const programSchema = z.object({
  disciplineId: requiredNumericIdSchema,
  degreeLevelId: requiredNumericIdSchema,
  semesters: z.coerce.number().int().min(1, 'Minimum is 1').max(10, 'Maximum is 10'),
  code: shortCodeSchema,
});

export const globalProgramSchema = programSchema.extend({
  departmentId: requiredNumericIdSchema,
});

export const updateProgramSchema = z.object({
  semesters: z.coerce.number().int().min(1, 'Minimum is 1').max(10, 'Maximum is 10'),
  code: shortCodeSchema,
});

export const classSchema = z.object({
  programId: requiredNumericIdSchema,
  currentSemester: z.coerce.number().int().min(1, 'Minimum is 1').max(10, 'Maximum is 10'),
  academicYear: z.coerce.number().int().min(2000, 'Invalid year').max(2100, 'Invalid year'),
  admissionYear: z.coerce.number().int().min(2000, 'Invalid year').max(2100, 'Invalid year'),
  section: z.enum(['A', 'B'], 'Select a section'),
});

export const courseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(50, 'Title is too long'),
  code: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(50, 'Code is too long')
    .transform((value) => value.toUpperCase()),
  creditHours: z.coerce.number().int().min(1, 'Minimum is 1').max(6, 'Maximum is 6'),
  departmentId: requiredNumericIdSchema,
});

export const updateCourseSchema = courseSchema.omit({ departmentId: true });

export const curriculumSchema = z.object({
  courseIds: z
    .array(z.coerce.number().int().positive('Select a valid course'))
    .min(1, 'Select at least one course'),
  semesterNumber: z.coerce.number().int().min(1, 'Minimum is 1').max(10, 'Maximum is 10'),
  batchYear: z.coerce.number().int().min(2000, 'Invalid year').max(2100, 'Invalid year'),
});

export const copyCurriculumBatchSchema = z
  .object({
    sourceBatchYear: z.coerce.number().int().min(2000, 'Invalid year').max(2100, 'Invalid year'),
    targetBatchYear: z.coerce.number().int().min(2000, 'Invalid year').max(2100, 'Invalid year'),
  })
  .refine((values) => values.sourceBatchYear !== values.targetBatchYear, {
    path: ['targetBatchYear'],
    message: 'Target batch must be different',
  });

export const teacherAssignmentSchema = z.object({
  courseId: requiredNumericIdSchema,
  teacherPublicId: requiredPublicIdSchema,
});

export const transferStudentSchema = z.object({
  studentPublicId: requiredPublicIdSchema,
});

export const replaceTeacherSchema = z.object({
  teacherPublicId: requiredPublicIdSchema,
});

export type DepartmentFormValues = z.output<typeof departmentSchema>;
export type DisciplineFormValues = z.output<typeof disciplineSchema>;
export type ProgramFormValues = z.output<typeof programSchema>;
export type GlobalProgramFormValues = z.output<typeof globalProgramSchema>;
export type UpdateProgramFormValues = z.output<typeof updateProgramSchema>;
export type ClassFormValues = z.output<typeof classSchema>;
export type CourseFormValues = z.output<typeof courseSchema>;
export type UpdateCourseFormValues = z.output<typeof updateCourseSchema>;
export type CurriculumFormValues = z.output<typeof curriculumSchema>;
export type CopyCurriculumBatchFormValues = z.output<typeof copyCurriculumBatchSchema>;
export type TeacherAssignmentFormValues = z.output<typeof teacherAssignmentSchema>;
export type TransferStudentFormValues = z.output<typeof transferStudentSchema>;
export type ReplaceTeacherFormValues = z.output<typeof replaceTeacherSchema>;
