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
  rollNumber: number;
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
  studentInfo: { classId: number; rollNumber: number } | null;
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

// ─── User Summary (embedded in other responses) ─────────────────────────────

export interface UserSummary {
  id: number;
  fullName: string;
  email: string;
  userType: UserType;
  profilePictureUrl: string | null;
}
