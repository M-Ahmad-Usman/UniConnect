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
  userId: number | null;
  scopeId: number | null;
  serverId: number | null;
  channelId: number | null;
}): AssignRoleRequest | null {
  if (!input.userId) {
    return null;
  }

  if (input.role === 'server_moderator') {
    return input.serverId
      ? { userId: input.userId, role: 'server_moderator', serverId: input.serverId }
      : null;
  }

  if (input.role === 'channel_moderator') {
    return input.serverId && input.channelId
      ? {
          userId: input.userId,
          role: 'channel_moderator',
          serverId: input.serverId,
          channelId: input.channelId,
        }
      : null;
  }

  return input.scopeId ? { userId: input.userId, role: input.role, scopeId: input.scopeId } : null;
}

export function normalizeRevokablePayload(
  assignment: RevokableRoleAssignment,
): RevokeRoleRequest {
  return assignment.revokePayload;
}

export function chooseInitialRole(options: RoleOption[]): AssignableRoleName | null {
  return options[0]?.role ?? null;
}
