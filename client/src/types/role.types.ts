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
  serverName?: string;
  channelId?: number | null;
  channelName?: string | null;
  scopeType?: ModeratorScopeType;
  scopeContext?: string;
}

// ─── Role Assignment ────────────────────────────────────────────────────────

export type AssignRoleRequest =
  | { userId: number; role: Exclude<RoleName, ModerationRoleName>; scopeId: number }
  | { userId: number; role: 'server_moderator'; serverId: number }
  | { userId: number; role: 'channel_moderator'; serverId: number; channelId: number };

export type RevokeRoleRequest =
  | { userId: number; role: Exclude<RevokableRoleName, ModerationRoleName>; scopeId: number }
  | { userId: number; role: 'server_moderator'; serverId: number }
  | { userId: number; role: 'channel_moderator'; serverId: number; channelId: number };
