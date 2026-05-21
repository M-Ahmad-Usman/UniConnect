import type { SocietyDetail, SocietyPermissions } from '@/types';

export type SocietyDetailTab = 'overview' | 'members' | 'requests';

const DEFAULT_SOCIETY_PERMISSIONS: SocietyPermissions = {
  canViewMembers: false,
  canManageMembers: false,
  canViewJoinRequests: false,
  canReviewJoinRequests: false,
  canEditInfo: false,
  canChangeLeadership: false,
  canManageChannels: false,
  canAssignModerators: false,
  canSubmitJoinRequest: false,
};

export function parseSocietyTab(value: string | null): SocietyDetailTab {
  return value === 'members' || value === 'requests' ? value : 'overview';
}

export function getSocietyDetailActionState(society: SocietyDetail | null | undefined) {
  const permissions = society?.permissions ?? DEFAULT_SOCIETY_PERMISSIONS;
  const tabs: SocietyDetailTab[] = ['overview'];

  if (permissions.canViewMembers) {
    tabs.push('members');
  }

  if (permissions.canViewJoinRequests) {
    tabs.push('requests');
  }

  return {
    tabs,
    canViewMembers: permissions.canViewMembers,
    canManageMembers: permissions.canManageMembers,
    canViewJoinRequests: permissions.canViewJoinRequests,
    canReviewJoinRequests: permissions.canReviewJoinRequests,
    canEditInfo: permissions.canEditInfo,
    canChangeLeadership: permissions.canChangeLeadership,
    canSubmitJoinRequest: permissions.canSubmitJoinRequest,
  };
}

export function isSocietyTabAvailable(
  tab: SocietyDetailTab,
  availableTabs: SocietyDetailTab[],
): boolean {
  return availableTabs.includes(tab);
}
