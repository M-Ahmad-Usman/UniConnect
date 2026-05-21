import { describe, expect, it } from 'vitest';
import type { RevokableRoleAssignment, RoleOption } from '@/types';
import {
  buildAssignPayload,
  chooseInitialRole,
  isModeratorRole,
  normalizeRevokablePayload,
} from '../utils';

describe('role management utils', () => {
  it('builds scoped role assignment payloads', () => {
    expect(
      buildAssignPayload({
        role: 'cr',
        userId: 10,
        scopeId: 20,
        serverId: null,
        channelId: null,
      }),
    ).toEqual({ userId: 10, role: 'cr', scopeId: 20 });
  });

  it('builds moderator assignment payloads only after required scopes are selected', () => {
    expect(
      buildAssignPayload({
        role: 'server_moderator',
        userId: 10,
        scopeId: null,
        serverId: 30,
        channelId: null,
      }),
    ).toEqual({ userId: 10, role: 'server_moderator', serverId: 30 });

    expect(
      buildAssignPayload({
        role: 'channel_moderator',
        userId: 10,
        scopeId: null,
        serverId: 30,
        channelId: null,
      }),
    ).toBeNull();

    expect(
      buildAssignPayload({
        role: 'channel_moderator',
        userId: 10,
        scopeId: null,
        serverId: 30,
        channelId: 40,
      }),
    ).toEqual({ userId: 10, role: 'channel_moderator', serverId: 30, channelId: 40 });
  });

  it('chooses the first backend-provided role option without adding local roles', () => {
    const options: RoleOption[] = [
      {
        role: 'server_moderator',
        label: 'Server Moderator',
        targetUserTypes: ['STUDENT'],
        scopeKind: 'server',
        requiresServer: true,
        requiresChannel: false,
      },
    ];

    expect(chooseInitialRole(options)).toBe('server_moderator');
    expect(chooseInitialRole([])).toBeNull();
  });

  it('normalizes backend-provided revoke payloads', () => {
    const assignment: RevokableRoleAssignment = {
      assignmentKey: 'server_moderator:1',
      role: 'server_moderator',
      user: {
        id: 5,
        fullName: 'Moderator',
        email: 'moderator@example.test',
        userType: 'STUDENT',
        departmentId: 1,
      },
      server: { id: 7, label: 'Class Server', type: 'CLASS' },
      revokePayload: { userId: 5, role: 'server_moderator', serverId: 7 },
    };

    expect(normalizeRevokablePayload(assignment)).toEqual({
      userId: 5,
      role: 'server_moderator',
      serverId: 7,
    });
  });

  it('detects moderator roles', () => {
    expect(isModeratorRole('server_moderator')).toBe(true);
    expect(isModeratorRole('channel_moderator')).toBe(true);
    expect(isModeratorRole('program_director')).toBe(false);
  });
});
