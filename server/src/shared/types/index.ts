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
  departmentId: number | null;
  mustChangePassword: boolean;
}

export interface UserRole {
  role: string;
  serverId: number;
  channelId?: number | null;
  scopeType: "server" | "channel";
  assignmentPublicId?: string;
  expiresAt?: Date | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userRoles?: UserRole[];
      requestId?: string;
    }
  }
}
