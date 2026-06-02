import type { Gender, UserStatus, UserType } from './enums';
import type { ScopedRoleAssignment } from './role.types';

// ─── User Profile (from GET /users/me) ──────────────────────────────────────

export interface UserProfile {
  publicId: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  bio: string | null;
  profilePictureUrl: string | null;
  userType: UserType;
  departmentId: number | null;
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: string;
  studentInfo: StudentInfo | null;
  teacherInfo: TeacherInfo | null;
  roles: ScopedRoleAssignment[];
}

export interface StudentInfo {
  rollNumber: string;
  classPublicId: string;
  class: {
    program: {
      code: string;
    };
  };
}

export interface TeacherInfo {
  designation: string;
}

// ─── User List Item (admin list) ────────────────────────────────────────────

export interface UserListItem {
  publicId: string;
  fullName: string;
  email: string;
  phone: string;
  userType: UserType;
  departmentId: number | null;
  status: UserStatus;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  profilePictureUrl?: string | null;
}

// ─── User Detail (from GET /users/:id) ──────────────────────────────────────

export interface UserDetail {
  publicId: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  bio: string | null;
  profilePictureUrl: string | null;
  userType: UserType;
  departmentId: number | null;
  status: UserStatus;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedByUser: { publicId: string; fullName: string; email: string } | null;
  mustChangePassword: boolean;
  createdAt: string;
  studentInfo: { classPublicId: string; rollNumber: string } | null;
  teacherInfo: { designation: string } | null;
}

// ─── Update Profile ─────────────────────────────────────────────────────────

export interface UpdateProfileRequest {
  bio?: string | null;
}

export interface UpdateProfileResponse {
  publicId: string;
  bio: string | null;
  updatedAt: string;
}

// ─── Create / Import Users ─────────────────────────────────────────────────

export interface CreateUserRequest {
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  userType: UserType;
  departmentId?: number;
  classPublicId?: string;
  rollNumber?: string;
  designation?: string;
}

export interface CreateUserResponse {
  publicId: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  userType: UserType;
  departmentId: number | null;
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: string;
  warning?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  userType?: UserType;
  departmentId?: number;
  status?: UserStatus;
  lifecycle?: 'live' | 'deleted' | 'all';
  search?: string;
}

export interface UserDeletionImpact {
  user: {
    publicId: string;
    fullName: string;
    email: string;
    userType: UserType;
    status: UserStatus;
    isDeleted: boolean;
  };
  canDelete: boolean;
  blockers: {
    hodDepartments: Array<{ id: number; name: string; code: string }>;
    directedPrograms: Array<{
      id: number;
      code: string;
      disciplineName: string;
      degreeLevel: string;
    }>;
    crClasses: Array<{
      publicId: string;
      programCode: string;
      section: string;
      currentSemester: number;
      admissionYear: number;
    }>;
    presidentSocieties: Array<{ publicId: string; name: string }>;
    convenorSocieties: Array<{ publicId: string; name: string }>;
    teachingAssignments: Array<{
      classPublicId: string;
      courseId: number;
      courseCode: string;
      courseTitle: string;
      programCode: string;
      section: string;
      currentSemester: number;
    }>;
  };
}

export interface UserLifecycleReasonRequest {
  reason?: string;
}

export interface UpdateUserStatusRequest extends UserLifecycleReasonRequest {
  status: UserStatus;
}

export interface BulkImportError {
  row: number;
  message: string;
}

export interface BulkImportResult {
  successful: number;
  failed: number;
  errors: BulkImportError[];
}

// ─── User Summary (embedded in other responses) ─────────────────────────────

export interface UserSummary {
  publicId: string;
  fullName: string;
  email: string;
  userType: UserType;
  profilePictureUrl: string | null;
}
