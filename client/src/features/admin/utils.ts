import { ClassStatus, UserStatus, UserType, type BulkImportError, type ClassDetail } from '@/types';

export const USER_PAGE_SIZE = 20;

export function parsePositiveInt(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseUserType(value: string | null) {
  if (value === UserType.ADMIN || value === UserType.TEACHER || value === UserType.STUDENT) {
    return value;
  }

  return undefined;
}

export function parseUserStatus(value: string | null) {
  if (value === UserStatus.ACTIVE || value === UserStatus.SUSPENDED) {
    return value;
  }

  return undefined;
}

export function parseUserLifecycle(value: string | null) {
  if (value === 'live' || value === 'deleted' || value === 'all') {
    return value;
  }

  return undefined;
}

export function userListParamsToRecord(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export function resolveCourseDepartmentFilter(
  canUpdateCourse: boolean,
  hodDepartmentIds: number[],
  requestedDepartmentId?: number,
) {
  if (canUpdateCourse) return requestedDepartmentId;
  return requestedDepartmentId && hodDepartmentIds.includes(requestedDepartmentId)
    ? requestedDepartmentId
    : hodDepartmentIds[0];
}

export function filterCourseDepartments<T extends { id: number }>(
  departments: T[],
  canUpdateCourse: boolean,
  hodDepartmentIds: number[],
) {
  return canUpdateCourse
    ? departments
    : departments.filter((department) => hodDepartmentIds.includes(department.id));
}

export function getClassDetailActionState(
  klass:
    | Pick<ClassDetail, 'currentSemester' | 'status' | 'program' | 'permissions'>
    | null
    | undefined,
) {
  const permissions = klass?.permissions;
  const isGraduated = klass?.status === ClassStatus.GRADUATED;
  const canViewStudents = permissions?.canViewStudents ?? false;
  const canManageStudents = (permissions?.canManageStudents ?? false) && !isGraduated;
  const canAssignCourses = (permissions?.canAssignCourses ?? false) && !isGraduated;
  const canReplaceCourseTeacher =
    (permissions?.canReplaceCourseTeacher ?? false) && !isGraduated;
  const canRemoveCourses = (permissions?.canRemoveCourses ?? false) && !isGraduated;
  const totalSemesters = klass?.program.semesters;
  const currentSemester = klass?.currentSemester;
  const hasSemesterMetadata =
    typeof totalSemesters === 'number' && typeof currentSemester === 'number';
  const canAdvanceSemester =
    (permissions?.canAdvanceSemester ?? false) &&
    !isGraduated &&
    hasSemesterMetadata &&
    currentSemester < totalSemesters;
  const canGraduate =
    (permissions?.canGraduate ?? false) &&
    !isGraduated &&
    hasSemesterMetadata &&
    currentSemester === totalSemesters;

  return {
    isGraduated,
    canViewStudents,
    canManageStudents,
    canAssignCourses,
    canReplaceCourseTeacher,
    canRemoveCourses,
    canAdvanceSemester,
    canGraduate,
  };
}

export function buildBulkImportErrorCsv(errors: BulkImportError[]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return ['row,message', ...errors.map((error) => `${error.row},${escape(error.message)}`)].join(
    '\n',
  );
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
