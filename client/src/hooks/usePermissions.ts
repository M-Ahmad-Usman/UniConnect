import { useMemo } from 'react';
import { useServerDetail } from '@/features/servers/hooks/useServerDetail';
import type { ClassPermissions, ScopedRoleAssignment, SocietyPermissions } from '@/types';
import { ServerType, UserType } from '@/types';
import { useAuthStore } from '@/stores/auth.store';

const CHANNEL_MANAGEMENT_ROLE_MAP: Record<(typeof ServerType)[keyof typeof ServerType], string[]> = {
  DEPARTMENT: ['hod'],
  CLASS: ['cr'],
  SOCIETY: ['society_president', 'society_convenor'],
};

function hasMatchingRole(
  serverId: number,
  userRoles: ScopedRoleAssignment[],
  acceptedRoles: string[],
) {
  return userRoles.some(
    (roleAssignment) =>
      roleAssignment.serverId === serverId && acceptedRoles.includes(roleAssignment.role),
  );
}

export function getDefaultClassPermissions(): ClassPermissions {
  return {
    canViewStudents: false,
    canManageStudents: false,
    canAssignCourses: false,
    canRemoveCourses: false,
    canReplaceCourseTeacher: false,
    canAdvanceSemester: false,
    canGraduate: false,
    canManageChannels: false,
    canAssignModerators: false,
  };
}

export function getDefaultSocietyPermissions(): SocietyPermissions {
  return {
    canViewMembers: false,
    canManageMembers: false,
    canViewJoinRequests: false,
    canReviewJoinRequests: false,
    canEditInfo: false,
    canChangeLeadership: false,
    canManageChannels: false,
    canAssignModerators: false,
    canSubmitJoinRequest: false,
    canManageLifecycle: false,
  };
}

export function getClassPermissions(
  permissions: ClassPermissions | null | undefined,
): ClassPermissions {
  return permissions ?? getDefaultClassPermissions();
}

export function getSocietyPermissions(
  permissions: SocietyPermissions | null | undefined,
): SocietyPermissions {
  return permissions ?? getDefaultSocietyPermissions();
}

export function canManageChannelsInServer(
  serverId: number | null,
  serverType: (typeof ServerType)[keyof typeof ServerType] | null,
  userType: (typeof UserType)[keyof typeof UserType] | null,
  userRoles: ScopedRoleAssignment[],
) {
  if (userType === UserType.ADMIN) {
    return true;
  }

  if (!serverType || serverId === null) {
    return false;
  }

  const allowedRoles = CHANNEL_MANAGEMENT_ROLE_MAP[serverType] ?? [];
  return hasMatchingRole(serverId, userRoles, allowedRoles);
}

export function usePermissions(serverId: number | null) {
  const user = useAuthStore((state) => state.user);
  const serverQuery = useServerDetail(serverId);

  return useMemo(() => {
    const canManage = canManageChannelsInServer(
      serverId,
      serverQuery.data?.type ?? null,
      user?.userType ?? null,
      user?.roles ?? [],
    );

    if (canManage) {
      return {
        isPermissionsLoading: false,
        canCreateChannels: true,
        canEditChannels: true,
        canLockChannels: true,
        canDeleteChannels: true,
      };
    }

    if (!serverQuery.data?.type) {
      return {
        isPermissionsLoading: serverId !== null && serverQuery.isLoading,
        canCreateChannels: false,
        canEditChannels: false,
        canLockChannels: false,
        canDeleteChannels: false,
      };
    }

    return {
      isPermissionsLoading: false,
      canCreateChannels: canManage,
      canEditChannels: canManage,
      canLockChannels: canManage,
      canDeleteChannels: canManage,
    };
  }, [serverId, serverQuery.data?.type, serverQuery.isLoading, user?.roles, user?.userType]);
}
