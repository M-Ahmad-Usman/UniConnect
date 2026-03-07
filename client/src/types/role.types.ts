import type { ModeratorScopeType } from './enums';

// ─── User Role (from getUserRoles) ──────────────────────────────────────────

export interface UserRole {
  role: string;
  departmentId?: number;
  departmentName?: string;
  programId?: number;
  programCode?: string;
  classId?: number;
  societyId?: number;
  societyName?: string;
  serverId?: number;
  channelId?: number | null;
  scopeType?: ModeratorScopeType;
}

// ─── Role Assignment ────────────────────────────────────────────────────────

export interface AssignRoleRequest {
  userId: number;
  role: string;
  departmentId?: number;
  programId?: number;
  classId?: number;
  societyId?: number;
  serverId?: number;
  channelId?: number;
  scopeType?: ModeratorScopeType;
}

export interface RevokeRoleRequest {
  userId: number;
  role: string;
  departmentId?: number;
  programId?: number;
  classId?: number;
  societyId?: number;
  serverId?: number;
  channelId?: number;
}
