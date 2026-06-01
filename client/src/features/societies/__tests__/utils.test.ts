import { describe, expect, it } from 'vitest';
import type { SocietyDetail, SocietyPermissions } from '@/types';
import {
  getSocietyDetailActionState,
  isSocietyTabAvailable,
  parseSocietyTab,
} from '../utils';

const emptyPermissions: SocietyPermissions = {
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

function societyWithPermissions(permissions: Partial<SocietyPermissions>) {
  return {
    permissions: { ...emptyPermissions, ...permissions },
  } as SocietyDetail;
}

describe('society detail action state', () => {
  it('limits non-members to overview and join affordance only', () => {
    const state = getSocietyDetailActionState(
      societyWithPermissions({ canSubmitJoinRequest: true }),
    );

    expect(state.tabs).toEqual(['overview']);
    expect(state.canViewMembers).toBe(false);
    expect(state.canViewJoinRequests).toBe(false);
    expect(state.canSubmitJoinRequest).toBe(true);
  });

  it('allows ordinary members to open members but not requests or management actions', () => {
    const state = getSocietyDetailActionState(
      societyWithPermissions({ canViewMembers: true }),
    );

    expect(state.tabs).toEqual(['overview', 'members']);
    expect(state.canManageMembers).toBe(false);
    expect(state.canViewJoinRequests).toBe(false);
  });

  it('enables management tabs for society leaders and admins', () => {
    const state = getSocietyDetailActionState(
      societyWithPermissions({
        canViewMembers: true,
        canManageMembers: true,
        canViewJoinRequests: true,
        canReviewJoinRequests: true,
      }),
    );

    expect(state.tabs).toEqual(['overview', 'members', 'requests']);
    expect(state.canManageMembers).toBe(true);
    expect(state.canReviewJoinRequests).toBe(true);
  });

  it('parses unsupported tabs as overview and detects unavailable tabs', () => {
    expect(parseSocietyTab('requests')).toBe('requests');
    expect(parseSocietyTab('bad-tab')).toBe('overview');
    expect(isSocietyTabAvailable('members', ['overview'])).toBe(false);
  });
});
