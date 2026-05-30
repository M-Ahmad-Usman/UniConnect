import type {
  AssignableRoleName,
  AssignRoleRequest,
  RevokeRoleRequest,
  RevokableRoleAssignment,
  RoleOption,
} from '@/types';

export function isModeratorRole(role: AssignableRoleName) {
  return role === 'server_moderator' || role === 'channel_moderator';
}

export function buildAssignPayload(input: {
  role: AssignableRoleName;
  userPublicId: string | null;
  scopeId: number | null;
  classPublicId: string | null;
  serverPublicId: string | null;
  channelPublicId: string | null;
  expiresAt: string | null;
}): AssignRoleRequest | null {
  if (!input.userPublicId) {
    return null;
  }

  if (input.role === 'server_moderator') {
    return input.serverPublicId
      ? {
          userPublicId: input.userPublicId,
          role: 'server_moderator',
          serverPublicId: input.serverPublicId,
          expiresAt: input.expiresAt,
        }
      : null;
  }

  if (input.role === 'channel_moderator') {
    return input.serverPublicId && input.channelPublicId
      ? {
          userPublicId: input.userPublicId,
          role: 'channel_moderator',
          serverPublicId: input.serverPublicId,
          channelPublicId: input.channelPublicId,
          expiresAt: input.expiresAt,
        }
      : null;
  }

  if (input.role === 'cr') {
    return input.classPublicId
      ? { userPublicId: input.userPublicId, role: 'cr', classPublicId: input.classPublicId }
      : null;
  }

  return input.scopeId
    ? { userPublicId: input.userPublicId, role: input.role, scopeId: input.scopeId }
    : null;
}

export function normalizeRevokablePayload(assignment: RevokableRoleAssignment): RevokeRoleRequest {
  return assignment.revokePayload;
}

export function chooseInitialRole(options: RoleOption[]): AssignableRoleName | null {
  return options[0]?.role ?? null;
}

export function toExpiryIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
