import type { PlatformRoleScopeType } from './enums';

export type RoleName =
  | 'admin'
  | 'enrollment_officer'
  | 'hod'
  | 'program_director'
  | 'cr'
  | 'society_president'
  | 'society_convenor'
  | 'server_moderator'
  | 'channel_moderator';

export type ModerationRoleName = 'server_moderator' | 'channel_moderator';
export type StaffRoleName = 'admin' | 'enrollment_officer';
export type RevokableRoleName = Exclude<RoleName, 'admin' | 'society_president' | 'society_convenor'>;
export type AssignableRoleName = Exclude<RoleName, 'admin' | 'society_president' | 'society_convenor'>;

export interface ScopedRoleAssignment {
  assignmentPublicId?: string;
  role: RoleName;
  serverPublicId?: string;
  channelPublicId?: string | null;
  departmentId?: number;
  departmentName?: string;
  scopeType: 'server' | 'channel' | 'department' | 'global';
  expiresAt?: string | null;
}

export interface UserRole {
  assignmentPublicId?: string;
  role: RoleName;
  departmentId?: number;
  departmentName?: string;
  programId?: number;
  programCode?: string;
  classPublicId?: string;
  societyPublicId?: string;
  societyName?: string;
  serverPublicId?: string;
  serverName?: string;
  channelPublicId?: string | null;
  channelName?: string | null;
  expiresAt?: string | null;
  scopeType?: PlatformRoleScopeType;
  scopeContext?: string;
}

export type AcademicAssignRoleRequest =
  | { userPublicId: string; role: 'hod'; scopeId: number }
  | { userPublicId: string; role: 'program_director'; scopeId: number }
  | { userPublicId: string; role: 'cr'; classPublicId: string };

export interface CreatePlatformAssignmentRequest {
  userPublicId: string;
  role: ModerationRoleName;
  serverPublicId: string;
  channelPublicId?: string;
  expiresAt?: string | null;
}

export interface CreateStaffAssignmentRequest {
  userPublicId: string;
  role: 'enrollment_officer';
  departmentId: number;
  expiresAt?: string | null;
}

export interface TransferAdminRequest {
  userPublicId: string;
}

export type AssignRoleRequest =
  | AcademicAssignRoleRequest
  | CreatePlatformAssignmentRequest
  | CreateStaffAssignmentRequest;

export type RevokeRoleRequest =
  | { role: 'hod' | 'program_director'; scopeId: number }
  | { role: 'cr'; classPublicId: string }
  | { assignmentPublicId: string; assignmentType?: 'platform' | 'staff' };

export interface UpdatePlatformAssignmentExpiryRequest {
  assignmentPublicId: string;
  expiresAt: string | null;
}

export interface PlatformAssignment {
  assignmentPublicId: string;
  role: ModerationRoleName;
  scopeType: PlatformRoleScopeType;
  assignedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  state: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  user: { publicId: string; fullName: string; email: string };
  server: { publicId: string; name: string; type: string };
  channel: { publicId: string; name: string } | null;
  assignedBy: { publicId: string; fullName: string } | null;
  revokedBy: { publicId: string; fullName: string } | null;
}

export interface StaffAssignment {
  assignmentPublicId: string;
  role: StaffRoleName;
  scopeType: 'global' | 'department';
  departmentId: number | null;
  assignedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  state: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  user: { publicId: string; fullName: string; email: string; userType: string };
  department: { id: number; name: string; code: string } | null;
  assignedBy: { publicId: string; fullName: string } | null;
  revokedBy: { publicId: string; fullName: string } | null;
}

export interface RoleOption {
  role: AssignableRoleName;
  label: string;
  targetUserTypes: Array<'STAFF' | 'TEACHER' | 'STUDENT'>;
  scopeKind: 'department' | 'program' | 'class' | 'server';
  requiresServer: boolean;
  requiresChannel: boolean;
}

export interface RoleScopeOption {
  id?: number;
  publicId?: string;
  label: string;
  kind: 'department' | 'program' | 'class' | 'server';
  serverPublicId?: string;
  disabled: boolean;
  disabledReason?: string;
  currentAssignee?: {
    publicId: string;
    fullName: string;
    email: string;
  };
}

export interface RoleChannelOption {
  publicId: string;
  serverPublicId: string;
  label: string;
  type: string;
  isLocked: boolean;
}

export interface RoleUserOption {
  publicId: string;
  fullName: string;
  email: string;
  userType: string;
  departmentId: number | null;
}

export interface RevokableRoleAssignment {
  assignmentKey: string;
  role: AssignableRoleName;
  expiresAt?: string | null;
  user: RoleUserOption;
  scope?: {
    id?: number;
    publicId?: string;
    label: string;
    kind: 'department' | 'program' | 'class';
  };
  server?: {
    publicId: string;
    label: string;
    type: string;
  };
  channel?: {
    publicId: string;
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
  serverPublicId: string;
}

export interface AssignableUsersParams extends RoleOptionParams {
  role: AssignableRoleName;
  scopeId?: number;
  classPublicId?: string;
  serverPublicId?: string;
  channelPublicId?: string;
}

export type RevokableRolesParams = AssignableUsersParams;

export interface PlatformAssignmentHistoryParams extends RoleOptionParams {
  state?: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  role?: ModerationRoleName;
  userPublicId?: string;
  serverPublicId?: string;
  channelPublicId?: string;
}
