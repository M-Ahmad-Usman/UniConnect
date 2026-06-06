import { describe, expect, it } from 'vitest';
import { Gender, UserType } from '@/types';
import {
  createUserSchema,
  copyCurriculumBatchSchema,
  curriculumSchema,
  globalProgramSchema,
  replaceTeacherSchema,
  teacherAssignmentSchema,
  toCreateUserPayload,
  transferStudentSchema,
  validateCsvFile,
} from '../schemas';

const baseInput = {
  fullName: 'Ayesha Khan',
  email: 'ayesha@ntu.edu.pk',
  phone: '03001234567',
  gender: Gender.FEMALE,
};
const publicId = '018f47a2-5d6b-7c8d-9e0f-123456789abc';

describe('createUserSchema', () => {
  it('rejects admin users because admins are created outside the UI/API flow', () => {
    const result = createUserSchema.safeParse({
      ...baseInput,
      userType: UserType.ADMIN,
      departmentId: '',
      programId: '',
      classPublicId: '',
      rollNumber: '',
      designation: '',
    });

    expect(result.success).toBe(false);
  });

  it('accepts student users with NTU roll numbers and coerces ids', () => {
    const result = createUserSchema.safeParse({
      ...baseInput,
      userType: UserType.STUDENT,
      departmentId: '1',
      programId: '2',
      classPublicId: publicId,
      rollNumber: '22-ntu-cs-1184',
      designation: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.rollNumber).toBe('22-NTU-CS-1184');
    expect(result.data?.classPublicId).toBe(publicId);
  });

  it('rejects invalid student roll numbers', () => {
    const result = createUserSchema.safeParse({
      ...baseInput,
      userType: UserType.STUDENT,
      departmentId: '1',
      programId: '2',
      classPublicId: publicId,
      rollNumber: '2022-CS-1184',
      designation: '',
    });

    expect(result.success).toBe(false);
  });

  it('builds the backend payload without frontend-only programId', () => {
    const result = createUserSchema.parse({
      ...baseInput,
      userType: UserType.STUDENT,
      departmentId: '1',
      programId: '2',
      classPublicId: publicId,
      rollNumber: '22-NTU-CS-1184',
      designation: '',
    });

    expect(toCreateUserPayload(result)).toEqual({
      ...baseInput,
      userType: UserType.STUDENT,
      departmentId: 1,
      classPublicId: publicId,
      rollNumber: '22-NTU-CS-1184',
    });
  });
});

describe('validateCsvFile', () => {
  it('accepts csv files', () => {
    const file = new File(['a,b'], 'users.csv', { type: 'text/csv' });
    expect(validateCsvFile(file)).toBeNull();
  });

  it('rejects non-csv files', () => {
    const file = new File(['{}'], 'users.json', { type: 'application/json' });
    expect(validateCsvFile(file)).toBe('Upload a CSV file.');
  });
});

describe('teacherAssignmentSchema', () => {
  it('coerces selected IDs for class course assignments', () => {
    expect(teacherAssignmentSchema.parse({ courseId: '12', teacherPublicId: publicId })).toEqual({
      courseId: 12,
      teacherPublicId: publicId,
    });
  });

  it('rejects empty selections', () => {
    expect(teacherAssignmentSchema.safeParse({ courseId: '', teacherPublicId: '' }).success).toBe(false);
  });
});

describe('curriculum schemas', () => {
  it('coerces multiple selected curriculum courses', () => {
    expect(
      curriculumSchema.parse({
        courseIds: ['12', '13'],
        semesterNumber: '2',
        batchYear: '2026',
      }),
    ).toEqual({
      courseIds: [12, 13],
      semesterNumber: 2,
      batchYear: 2026,
    });
  });

  it('rejects empty course selections', () => {
    expect(
      curriculumSchema.safeParse({
        courseIds: [],
        semesterNumber: '1',
        batchYear: '2026',
      }).success,
    ).toBe(false);
  });

  it('requires different source and target batches for copy', () => {
    expect(
      copyCurriculumBatchSchema.safeParse({
        sourceBatchYear: '2026',
        targetBatchYear: '2026',
      }).success,
    ).toBe(false);
  });
});

describe('globalProgramSchema', () => {
  it('coerces catalog selections and normalizes the program code', () => {
    expect(
      globalProgramSchema.parse({
        departmentId: '1',
        disciplineId: '2',
        degreeLevelId: '3',
        semesters: '8',
        code: 'bscs',
      }),
    ).toEqual({
      departmentId: 1,
      disciplineId: 2,
      degreeLevelId: 3,
      semesters: 8,
      code: 'BSCS',
    });
  });

  it('rejects missing department selection', () => {
    expect(
      globalProgramSchema.safeParse({
        departmentId: '',
        disciplineId: '2',
        degreeLevelId: '3',
        semesters: '8',
        code: 'BSCS',
      }).success,
    ).toBe(false);
  });
});

describe('class hardening form schemas', () => {
  it('validates selected transfer students', () => {
    expect(transferStudentSchema.parse({ studentPublicId: publicId })).toEqual({ studentPublicId: publicId });
    expect(transferStudentSchema.safeParse({ studentPublicId: '' }).success).toBe(false);
    expect(transferStudentSchema.safeParse({ studentPublicId: '0' }).success).toBe(false);
  });

  it('validates selected replacement teachers', () => {
    expect(replaceTeacherSchema.parse({ teacherPublicId: publicId })).toEqual({ teacherPublicId: publicId });
    expect(replaceTeacherSchema.safeParse({ teacherPublicId: '' }).success).toBe(false);
    expect(replaceTeacherSchema.safeParse({ teacherPublicId: '-1' }).success).toBe(false);
  });
});
