import type { Gender, UserType } from './enums';
import type { ScopedRoleAssignment } from './role.types';

// ─── User Profile (from GET /users/me) ──────────────────────────────────────

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  bio: string | null;
  profilePictureUrl: string | null;
  userType: UserType;
  departmentId: number | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  studentInfo: StudentInfo | null;
  teacherInfo: TeacherInfo | null;
  roles: ScopedRoleAssignment[];
}

export interface StudentInfo {
  rollNumber: string;
  classId: number;
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
  id: number;
  fullName: string;
  email: string;
  phone: string;
  userType: UserType;
  departmentId: number | null;
  isActive: boolean;
  createdAt: string;
  profilePictureUrl?: string | null;
}

// ─── User Detail (from GET /users/:id) ──────────────────────────────────────

export interface UserDetail {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  bio: string | null;
  profilePictureUrl: string | null;
  userType: UserType;
  departmentId: number | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  studentInfo: { classId: number; rollNumber: string } | null;
  teacherInfo: { designation: string } | null;
}

// ─── Update Profile ─────────────────────────────────────────────────────────

export interface UpdateProfileRequest {
  bio?: string | null;
}

export interface UpdateProfileResponse {
  id: number;
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
  classId?: number;
  rollNumber?: string;
  designation?: string;
}

export interface CreateUserResponse {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  userType: UserType;
  departmentId: number | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  warning?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  userType?: UserType;
  departmentId?: number;
  isActive?: boolean;
  search?: string;
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
  id: number;
  fullName: string;
  email: string;
  userType: UserType;
  profilePictureUrl: string | null;
}
