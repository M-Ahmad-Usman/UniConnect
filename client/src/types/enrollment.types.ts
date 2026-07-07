import type { Gender, Section, ClassStatus } from './enums';
import type { PaginationParams } from './api.types';
import type {
  ClassDetail,
  ClassListItem,
  ClassStudent,
  CurriculumEntry,
  DepartmentListItem,
  ProgramDetail,
} from './catalog.types';
import type { BulkImportResult, CreateUserResponse } from './user.types';

export interface EnrollmentBootstrap {
  isAdmin: boolean;
  departments: Array<Pick<DepartmentListItem, 'id' | 'name' | 'code'>>;
  defaultDepartmentId: number | null;
  capabilities: {
    canCreateClass: boolean;
    canCreateStudent: boolean;
    canImportStudents: boolean;
    canTransferStudents: boolean;
    canViewRosters: boolean;
  };
}

export interface EnrollmentProgramParams extends PaginationParams {
  departmentId?: number;
}

export interface EnrollmentClassParams extends PaginationParams {
  departmentId?: number;
  programId?: number;
  semester?: number;
  section?: Section;
  status?: ClassStatus | 'ALL';
}

export type EnrollmentCandidateParams = PaginationParams;

export interface EnrollmentCreateClassRequest {
  programId: number;
  currentSemester: number;
  academicYear: number;
  admissionYear: number;
  section: Section;
}

export interface EnrollmentCreateStudentRequest {
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  classPublicId: string;
  rollNumber: string;
}

export type EnrollmentClassListItem = ClassListItem;
export type EnrollmentClassDetail = ClassDetail;
export type EnrollmentClassStudent = ClassStudent;
export type EnrollmentProgram = ProgramDetail;
export type EnrollmentCurriculumEntry = CurriculumEntry;
export type EnrollmentCreateStudentResponse = CreateUserResponse;
export type EnrollmentImportResult = BulkImportResult;
