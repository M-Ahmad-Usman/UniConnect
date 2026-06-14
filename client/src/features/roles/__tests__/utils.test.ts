import { describe, expect, it } from 'vitest';
import type { RevokableRoleAssignment, RoleOption } from '@/types';
import {
  buildAssignPayload,
  chooseInitialRole,
  isModeratorRole,
  normalizeRevokablePayload,
} from '../utils';

describe('role management utils', () => {
  it('builds canonical academic assignment payloads', () => {
    expect(
      buildAssignPayload({
        role: 'cr',
        userPublicId: 'user-public-id',
        scopeId: null,
        classPublicId: 'class-public-id',
        serverPublicId: null,
        channelPublicId: null,
        expiresAt: null,
      }),
    ).toEqual({ userPublicId: 'user-public-id', role: 'cr', classPublicId: 'class-public-id' });
  });

  it('builds platform assignment payloads only after required scopes are selected', () => {
    expect(
      buildAssignPayload({
        role: 'server_moderator',
        userPublicId: 'user-public-id',
        scopeId: null,
        classPublicId: null,
        serverPublicId: 'server-public-id',
        channelPublicId: null,
        expiresAt: null,
      }),
    ).toEqual({
      userPublicId: 'user-public-id',
      role: 'server_moderator',
      serverPublicId: 'server-public-id',
      expiresAt: null,
    });

    expect(
      buildAssignPayload({
        role: 'channel_moderator',
        userPublicId: 'user-public-id',
        scopeId: null,
        classPublicId: null,
        serverPublicId: 'server-public-id',
        channelPublicId: null,
        expiresAt: null,
      }),
    ).toBeNull();
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

  it('normalizes backend-provided platform revoke payloads', () => {
    const assignment: RevokableRoleAssignment = {
      assignmentKey: 'server_moderator:assignment-public-id',
      role: 'server_moderator',
      user: {
        publicId: 'user-public-id',
        fullName: 'Moderator',
        email: 'moderator@example.test',
        userType: 'STUDENT',
        departmentId: 1,
      },
      server: { publicId: 'server-public-id', label: 'Class Server', type: 'CLASS' },
      revokePayload: { assignmentPublicId: 'assignment-public-id' },
    };

    expect(normalizeRevokablePayload(assignment)).toEqual({
      assignmentPublicId: 'assignment-public-id',
    });
  });

  it('detects moderator roles', () => {
    expect(isModeratorRole('server_moderator')).toBe(true);
    expect(isModeratorRole('channel_moderator')).toBe(true);
    expect(isModeratorRole('program_director')).toBe(false);
  });
});
