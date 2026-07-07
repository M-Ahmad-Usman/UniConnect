import { describe, expect, it } from 'vitest';
import {
  canManageChannelsInServer,
  getClassPermissions,
  getDefaultClassPermissions,
  getDefaultSocietyPermissions,
  getSocietyPermissions,
} from '@/hooks/usePermissions';
import { ServerType } from '@/types';
import type { RoleName, ScopedRoleAssignment } from '@/types';

function scopedRole(role: RoleName, serverPublicId = 'server-1'): ScopedRoleAssignment {
  return {
    role,
    serverPublicId,
    scopeType: 'server',
  };
}

function adminRole(): ScopedRoleAssignment {
  return {
    role: 'admin',
    scopeType: 'global',
  };
}

describe('canManageChannelsInServer', () => {
  it('allows admins in all server types', () => {
    expect(canManageChannelsInServer('server-1', ServerType.DEPARTMENT, [adminRole()])).toBe(true);
    expect(canManageChannelsInServer('server-1', ServerType.CLASS, [adminRole()])).toBe(true);
    expect(canManageChannelsInServer('server-1', ServerType.SOCIETY, [adminRole()])).toBe(true);
  });

  it('allows HOD role only in department servers', () => {
    expect(
      canManageChannelsInServer('server-1', ServerType.DEPARTMENT, [scopedRole('hod')]),
    ).toBe(true);
    expect(
      canManageChannelsInServer('server-1', ServerType.CLASS, [scopedRole('hod')]),
    ).toBe(false);
  });

  it('allows CR role only in class servers', () => {
    expect(
      canManageChannelsInServer('server-1', ServerType.CLASS, [scopedRole('cr')]),
    ).toBe(true);
    expect(
      canManageChannelsInServer('server-1', ServerType.SOCIETY, [scopedRole('cr')]),
    ).toBe(false);
  });

  it('allows society leadership roles only in society servers', () => {
    expect(
      canManageChannelsInServer('server-1', ServerType.SOCIETY, [
        scopedRole('society_president'),
      ]),
    ).toBe(true);
    expect(
      canManageChannelsInServer('server-1', ServerType.SOCIETY, [
        scopedRole('society_convenor'),
      ]),
    ).toBe(true);
    expect(
      canManageChannelsInServer('server-1', ServerType.DEPARTMENT, [
        scopedRole('society_president'),
      ]),
    ).toBe(false);
  });

  it('does not grant management rights from the same role on a different server', () => {
    expect(
      canManageChannelsInServer('server-1', ServerType.DEPARTMENT, [
        scopedRole('hod', 'server-2'),
      ]),
    ).toBe(false);
  });

  it('denies access when server type is unknown or roles do not match', () => {
    expect(canManageChannelsInServer('server-1', null, [scopedRole('hod')])).toBe(false);
    expect(
      canManageChannelsInServer('server-1', ServerType.DEPARTMENT, [
        scopedRole('server_moderator'),
      ]),
    ).toBe(false);
  });
});

describe('backend capability helpers', () => {
  it('defaults missing class permissions to all false', () => {
    expect(getClassPermissions(undefined)).toEqual(getDefaultClassPermissions());
    expect(Object.values(getClassPermissions(null)).every((value) => value === false)).toBe(true);
  });

  it('defaults missing society permissions to all false', () => {
    expect(getSocietyPermissions(undefined)).toEqual(getDefaultSocietyPermissions());
    expect(Object.values(getSocietyPermissions(null)).every((value) => value === false)).toBe(true);
  });

  it('preserves backend class action visibility flags', () => {
    const permissions = {
      ...getDefaultClassPermissions(),
      canAssignCourses: true,
      canReplaceCourseTeacher: true,
    };

    expect(getClassPermissions(permissions).canAssignCourses).toBe(true);
    expect(getClassPermissions(permissions).canReplaceCourseTeacher).toBe(true);
    expect(getClassPermissions(permissions).canManageStudents).toBe(false);
  });

  it('distinguishes society member, request, and management capabilities', () => {
    const permissions = {
      ...getDefaultSocietyPermissions(),
      canViewMembers: true,
      canViewJoinRequests: false,
      canManageMembers: false,
    };

    expect(getSocietyPermissions(permissions).canViewMembers).toBe(true);
    expect(getSocietyPermissions(permissions).canViewJoinRequests).toBe(false);
    expect(getSocietyPermissions(permissions).canManageMembers).toBe(false);
  });
});
