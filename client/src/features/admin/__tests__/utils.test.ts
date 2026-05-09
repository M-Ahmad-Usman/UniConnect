import { describe, expect, it } from 'vitest';
import {
  buildBulkImportErrorCsv,
  parseIsActive,
  parsePositiveInt,
  parseUserType,
  userListParamsToRecord,
} from '../utils';
import { UserType } from '@/types';

describe('admin user filter helpers', () => {
  it('parses positive integer URL values', () => {
    expect(parsePositiveInt('3')).toBe(3);
    expect(parsePositiveInt('0')).toBeUndefined();
    expect(parsePositiveInt('abc')).toBeUndefined();
  });

  it('parses supported enum filters only', () => {
    expect(parseUserType(UserType.STUDENT)).toBe(UserType.STUDENT);
    expect(parseUserType('OTHER')).toBeUndefined();
    expect(parseIsActive('true')).toBe(true);
    expect(parseIsActive('false')).toBe(false);
    expect(parseIsActive('all')).toBeUndefined();
  });

  it('drops undefined and empty query values', () => {
    expect(userListParamsToRecord({ page: 1, search: '', userType: undefined })).toEqual({
      page: 1,
    });
  });
});

describe('buildBulkImportErrorCsv', () => {
  it('exports row and message columns with escaping', () => {
    expect(buildBulkImportErrorCsv([{ row: 4, message: 'Email "already" exists' }])).toBe(
      'row,message\n4,"Email ""already"" exists"',
    );
  });
});
