import { describe, expect, it } from 'vitest';
import { Gender, UserType } from '@/types';
import {
  createUserSchema,
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

describe('createUserSchema', () => {
  it('accepts admin users without academic fields', () => {
    const result = createUserSchema.safeParse({
      ...baseInput,
      userType: UserType.ADMIN,
      departmentId: '',
      programId: '',
      classId: '',
      rollNumber: '',
      designation: '',
    });

    expect(result.success).toBe(true);
  });

  it('accepts student users with NTU roll numbers and coerces ids', () => {
    const result = createUserSchema.safeParse({
      ...baseInput,
      userType: UserType.STUDENT,
      departmentId: '1',
      programId: '2',
      classId: '3',
      rollNumber: '22-ntu-cs-1184',
      designation: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.rollNumber).toBe('22-NTU-CS-1184');
    expect(result.data?.classId).toBe(3);
  });

  it('rejects invalid student roll numbers', () => {
    const result = createUserSchema.safeParse({
      ...baseInput,
      userType: UserType.STUDENT,
      departmentId: '1',
      programId: '2',
      classId: '3',
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
      classId: '3',
      rollNumber: '22-NTU-CS-1184',
      designation: '',
    });

    expect(toCreateUserPayload(result)).toEqual({
      ...baseInput,
      userType: UserType.STUDENT,
      departmentId: 1,
      classId: 3,
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
    expect(teacherAssignmentSchema.parse({ courseId: '12', teacherId: '7' })).toEqual({
      courseId: 12,
      teacherId: 7,
    });
  });

  it('rejects empty selections', () => {
    expect(teacherAssignmentSchema.safeParse({ courseId: '', teacherId: '' }).success).toBe(
      false,
    );
  });
});

describe('class hardening form schemas', () => {
  it('validates selected transfer students', () => {
    expect(transferStudentSchema.parse({ studentId: '42' })).toEqual({ studentId: 42 });
    expect(transferStudentSchema.safeParse({ studentId: '' }).success).toBe(false);
    expect(transferStudentSchema.safeParse({ studentId: '0' }).success).toBe(false);
  });

  it('validates selected replacement teachers', () => {
    expect(replaceTeacherSchema.parse({ teacherId: '17' })).toEqual({ teacherId: 17 });
    expect(replaceTeacherSchema.safeParse({ teacherId: '' }).success).toBe(false);
    expect(replaceTeacherSchema.safeParse({ teacherId: '-1' }).success).toBe(false);
  });
});
