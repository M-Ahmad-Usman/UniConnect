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
export type AssignableRoleName = Exclude<RoleName, 'society_president' | 'society_convenor'>;

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
  | { userId: number; role: Exclude<AssignableRoleName, ModerationRoleName>; scopeId: number }
  | { userId: number; role: 'server_moderator'; serverId: number }
  | { userId: number; role: 'channel_moderator'; serverId: number; channelId: number };

export type RevokeRoleRequest =
  | { userId: number; role: Exclude<RevokableRoleName, ModerationRoleName>; scopeId: number }
  | { userId: number; role: 'server_moderator'; serverId: number }
  | { userId: number; role: 'channel_moderator'; serverId: number; channelId: number };

export interface RoleOption {
  role: AssignableRoleName;
  label: string;
  targetUserTypes: Array<'ADMIN' | 'TEACHER' | 'STUDENT'>;
  scopeKind: 'department' | 'program' | 'class' | 'server';
  requiresServer: boolean;
  requiresChannel: boolean;
}

export interface RoleScopeOption {
  id: number;
  label: string;
  kind: 'department' | 'program' | 'class' | 'server';
  serverId?: number;
  disabled: boolean;
  disabledReason?: string;
  currentAssignee?: {
    id: number;
    fullName: string;
    email: string;
  };
}

export interface RoleChannelOption {
  id: number;
  serverId: number;
  label: string;
  type: string;
  isLocked: boolean;
}

export interface RoleUserOption {
  id: number;
  fullName: string;
  email: string;
  userType: string;
  departmentId: number | null;
}

export interface RevokableRoleAssignment {
  assignmentKey: string;
  role: AssignableRoleName;
  user: RoleUserOption;
  scope?: {
    id: number;
    label: string;
    kind: 'department' | 'program' | 'class';
  };
  server?: {
    id: number;
    label: string;
    type: string;
  };
  channel?: {
    id: number;
    label: string;
  };
  revokePayload: RevokeRoleRequest;
}

export interface RoleOptionParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AssignableScopesParams extends RoleOptionParams {
  role: AssignableRoleName;
}

export interface AssignableChannelsParams extends RoleOptionParams {
  serverId: number;
}

export interface AssignableUsersParams extends RoleOptionParams {
  role: AssignableRoleName;
  scopeId?: number;
  serverId?: number;
  channelId?: number;
}

export interface RevokableRolesParams extends RoleOptionParams {
  role: AssignableRoleName;
  scopeId?: number;
  serverId?: number;
  channelId?: number;
}
