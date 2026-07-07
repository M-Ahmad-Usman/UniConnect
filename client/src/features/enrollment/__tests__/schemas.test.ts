import { describe, expect, it } from 'vitest';
import { Gender } from '@/types';
import {
  enrollmentClassSchema,
  enrollmentStudentSchema,
  transferStudentSchema,
  validateCsvFile,
} from '../schemas';

const publicId = '018f47a2-5d6b-7c8d-9e0f-123456789abc';

describe('enrollment schemas', () => {
  it('validates class creation input and coerces numeric fields', () => {
    const result = enrollmentClassSchema.safeParse({
      programId: '1',
      currentSemester: '1',
      academicYear: '2026',
      admissionYear: '2026',
      section: 'A',
    });

    expect(result.success).toBe(true);
    expect(result.data?.programId).toBe(1);
  });

  it('validates student creation input as student-only enrollment payload', () => {
    const result = enrollmentStudentSchema.safeParse({
      fullName: 'Ayesha Khan',
      email: 'ayesha@ntu.edu.pk',
      phone: '03001234567',
      gender: Gender.FEMALE,
      classPublicId: publicId,
      rollNumber: '22-ntu-cs-1184',
    });

    expect(result.success).toBe(true);
    expect(result.data?.rollNumber).toBe('22-NTU-CS-1184');
  });

  it('rejects invalid transfer targets and roll numbers', () => {
    expect(transferStudentSchema.safeParse({ studentPublicId: 'not-a-public-id' }).success).toBe(
      false,
    );
    expect(
      enrollmentStudentSchema.safeParse({
        fullName: 'Ayesha Khan',
        email: 'ayesha@ntu.edu.pk',
        phone: '03001234567',
        gender: Gender.FEMALE,
        classPublicId: publicId,
        rollNumber: '2022-CS-1184',
      }).success,
    ).toBe(false);
  });

  it('validates CSV uploads by extension/type and size', () => {
    expect(validateCsvFile(new File(['a'], 'students.csv', { type: 'text/csv' }))).toBeNull();
    expect(validateCsvFile(new File(['a'], 'students.txt', { type: 'application/json' }))).toBe(
      'Upload a CSV file.',
    );
  });
});
