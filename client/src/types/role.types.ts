import type { ModeratorScopeType } from './enums';

export type RoleName =
  | 'hod'
  | 'program_director'
  | 'cr'
  | 'society_president'
  | 'society_convenor'
  | 'server_moderator'
  | 'channel_moderator';

export type ModerationRoleName = 'server_moderator' | 'channel_moderator';
export type RevokableRoleName = Exclude<RoleName, 'society_president' | 'society_convenor'>;

export interface ScopedRoleAssignment {
  role: RoleName;
  serverId: number;
  channelId?: number | null;
  scopeType: 'server' | 'channel';
}

// ─── User Role (from getUserRoles) ──────────────────────────────────────────

export interface UserRole {
  role: RoleName;
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
  role: RoleName;
  scopeId?: number;
  serverId?: number;
  channelId?: number;
  scopeType?: ModeratorScopeType;
}

export interface RevokeRoleRequest {
  userId: number;
  role: RevokableRoleName;
  scopeId?: number;
  serverId?: number;
  channelId?: number;
}
