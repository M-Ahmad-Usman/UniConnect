import type { UserType } from './enums';
import type { ScopedRoleAssignment } from './role.types';

// ─── Auth User (from POST /auth/login response) ────────────────────────────

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  userType: UserType;
  mustChangePassword: boolean;
  roles?: ScopedRoleAssignment[];
}

// ─── Login ──────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export type LoginResponse = AuthUser;

// ─── Password Reset ─────────────────────────────────────────────────────────

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export type EmptyAuthResponse = Record<string, never>;
