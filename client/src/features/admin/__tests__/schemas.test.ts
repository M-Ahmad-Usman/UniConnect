import { describe, expect, it } from 'vitest';
import { Gender, UserType } from '@/types';
import { createUserSchema, toCreateUserPayload, validateCsvFile } from '../schemas';

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
