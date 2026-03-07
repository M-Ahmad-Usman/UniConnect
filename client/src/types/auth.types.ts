import type { UserType } from './enums';

// ─── Auth User (from POST /auth/login response) ────────────────────────────

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  userType: UserType;
  mustChangePassword: boolean;
}

// ─── Login ──────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

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
