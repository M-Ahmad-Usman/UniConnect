import type { Logger } from "pino";

// ─── Standard API Response Types ────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>[];
    requestId?: string;
  };
}

// ─── Extend Express Request ─────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  email: string;
  userType: string;
  baseUserType: string;
  isAdmin: boolean;
  departmentId: number | null;
  mustChangePassword: boolean;
}

export interface UserRole {
  role: string;
  serverId?: number;
  channelId?: number | null;
  departmentId?: number | null;
  scopeType: "server" | "channel" | "department" | "global";
  assignmentPublicId?: string;
  expiresAt?: Date | null;
}

export interface ResolvedServerTarget {
  id: number;
  publicId: string;
}

export interface ResolvedChannelTarget {
  id: number;
  publicId: string;
  serverId: number;
  serverPublicId: string;
  isArchived: boolean;
}

export interface ResolvedPostTarget {
  id: number;
  publicId: string;
  channelId: number;
  channelPublicId: string;
  serverId: number;
  serverPublicId: string;
  channelIsArchived: boolean;
}

export interface ResolvedCommunicationTarget {
  server: ResolvedServerTarget;
  channel?: ResolvedChannelTarget;
  post?: ResolvedPostTarget;
}

export interface ResolvedClassTarget {
  id: number;
  publicId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userRoles?: UserRole[];
      requestId?: string;
      log?: Logger;
      communicationTarget?: ResolvedCommunicationTarget;
      classTarget?: ResolvedClassTarget;
    }
  }
}
