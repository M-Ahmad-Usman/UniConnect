import { describe, expect, it } from 'vitest';
import {
  buildBulkImportErrorCsv,
  getClassDetailActionState,
  parsePositiveInt,
  parseUserLifecycle,
  parseUserStatus,
  parseUserType,
  userListParamsToRecord,
} from '../utils';
import { ClassStatus, UserStatus, UserType, type ClassDetail, type ClassPermissions } from '@/types';

describe('admin user filter helpers', () => {
  it('parses positive integer URL values', () => {
    expect(parsePositiveInt('3')).toBe(3);
    expect(parsePositiveInt('0')).toBeUndefined();
    expect(parsePositiveInt('abc')).toBeUndefined();
  });

  it('parses supported enum filters only', () => {
    expect(parseUserType(UserType.STUDENT)).toBe(UserType.STUDENT);
    expect(parseUserType('OTHER')).toBeUndefined();
    expect(parseUserStatus(UserStatus.ACTIVE)).toBe(UserStatus.ACTIVE);
    expect(parseUserStatus('OTHER')).toBeUndefined();
    expect(parseUserLifecycle('deleted')).toBe('deleted');
    expect(parseUserLifecycle('invalid')).toBeUndefined();
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

const emptyClassPermissions: ClassPermissions = {
  canViewStudents: false,
  canManageStudents: false,
  canAssignCourses: false,
  canRemoveCourses: false,
  canReplaceCourseTeacher: false,
  canAdvanceSemester: false,
  canGraduate: false,
  canManageChannels: false,
  canAssignModerators: false,
};

function classDetailWithPermissions(
  permissions: Partial<ClassPermissions>,
  overrides: Partial<Pick<ClassDetail, 'currentSemester' | 'status'>> = {},
) {
  return {
    currentSemester: overrides.currentSemester ?? 3,
    status: overrides.status ?? ClassStatus.ACTIVE,
    program: { semesters: 8 },
    permissions: { ...emptyClassPermissions, ...permissions },
  } as Pick<ClassDetail, 'currentSemester' | 'status' | 'program' | 'permissions'>;
}

describe('getClassDetailActionState', () => {
  it('enables HOD/admin academic controls for active non-final classes', () => {
    expect(
      getClassDetailActionState(
        classDetailWithPermissions({
          canViewStudents: true,
          canManageStudents: true,
          canAssignCourses: true,
          canRemoveCourses: true,
          canReplaceCourseTeacher: true,
          canAdvanceSemester: true,
          canGraduate: true,
        }),
      ),
    ).toMatchObject({
      canViewStudents: true,
      canManageStudents: true,
      canAssignCourses: true,
      canRemoveCourses: true,
      canReplaceCourseTeacher: true,
      canAdvanceSemester: true,
      canGraduate: false,
    });
  });

  it('keeps PD controls limited to course and teacher assignment actions', () => {
    expect(
      getClassDetailActionState(
        classDetailWithPermissions({
          canAssignCourses: true,
          canRemoveCourses: true,
          canReplaceCourseTeacher: true,
        }),
      ),
    ).toMatchObject({
      canViewStudents: false,
      canManageStudents: false,
      canAssignCourses: true,
      canRemoveCourses: true,
      canReplaceCourseTeacher: true,
      canAdvanceSemester: false,
      canGraduate: false,
    });
  });

  it('shows graduation only for active final-semester classes', () => {
    expect(
      getClassDetailActionState(
        classDetailWithPermissions(
          { canGraduate: true, canAdvanceSemester: true },
          { currentSemester: 8 },
        ),
      ),
    ).toMatchObject({
      canAdvanceSemester: false,
      canGraduate: true,
    });
  });

  it('disables academic mutations for graduated classes', () => {
    expect(
      getClassDetailActionState(
        classDetailWithPermissions(
          {
            canManageStudents: true,
            canAssignCourses: true,
            canRemoveCourses: true,
            canReplaceCourseTeacher: true,
            canAdvanceSemester: true,
            canGraduate: true,
          },
          { status: ClassStatus.GRADUATED, currentSemester: 8 },
        ),
      ),
    ).toMatchObject({
      isGraduated: true,
      canManageStudents: false,
      canAssignCourses: false,
      canRemoveCourses: false,
      canReplaceCourseTeacher: false,
      canAdvanceSemester: false,
      canGraduate: false,
    });
  });
});
