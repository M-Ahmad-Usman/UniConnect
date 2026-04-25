import { describe, expect, it } from 'vitest';
import { canManageChannelsInServer } from '@/hooks/usePermissions';
import { ServerType, UserType } from '@/types';
import type { RoleName, ScopedRoleAssignment } from '@/types';

function scopedRole(role: RoleName, serverId = 1): ScopedRoleAssignment {
  return {
    role,
    serverId,
    scopeType: 'server',
  };
}

describe('canManageChannelsInServer', () => {
  it('allows admins in all server types', () => {
    expect(canManageChannelsInServer(1, ServerType.DEPARTMENT, UserType.ADMIN, [])).toBe(true);
    expect(canManageChannelsInServer(1, ServerType.CLASS, UserType.ADMIN, [])).toBe(true);
    expect(canManageChannelsInServer(1, ServerType.SOCIETY, UserType.ADMIN, [])).toBe(true);
  });

  it('allows HOD role only in department servers', () => {
    expect(
      canManageChannelsInServer(1, ServerType.DEPARTMENT, UserType.TEACHER, [scopedRole('hod')]),
    ).toBe(true);
    expect(
      canManageChannelsInServer(1, ServerType.CLASS, UserType.TEACHER, [scopedRole('hod')]),
    ).toBe(false);
  });

  it('allows CR role only in class servers', () => {
    expect(
      canManageChannelsInServer(1, ServerType.CLASS, UserType.STUDENT, [scopedRole('cr')]),
    ).toBe(true);
    expect(
      canManageChannelsInServer(1, ServerType.SOCIETY, UserType.STUDENT, [scopedRole('cr')]),
    ).toBe(false);
  });

  it('allows society leadership roles only in society servers', () => {
    expect(
      canManageChannelsInServer(1, ServerType.SOCIETY, UserType.STUDENT, [
        scopedRole('society_president'),
      ]),
    ).toBe(true);
    expect(
      canManageChannelsInServer(1, ServerType.SOCIETY, UserType.TEACHER, [
        scopedRole('society_convenor'),
      ]),
    ).toBe(true);
    expect(
      canManageChannelsInServer(1, ServerType.DEPARTMENT, UserType.STUDENT, [
        scopedRole('society_president'),
      ]),
    ).toBe(false);
  });

  it('does not grant management rights from the same role on a different server', () => {
    expect(
      canManageChannelsInServer(1, ServerType.DEPARTMENT, UserType.TEACHER, [
        scopedRole('hod', 2),
      ]),
    ).toBe(false);
  });

  it('denies access when server type is unknown or roles do not match', () => {
    expect(canManageChannelsInServer(1, null, UserType.TEACHER, [scopedRole('hod')])).toBe(false);
    expect(
      canManageChannelsInServer(1, ServerType.DEPARTMENT, UserType.TEACHER, [
        scopedRole('server_moderator'),
      ]),
    ).toBe(false);
  });
});
