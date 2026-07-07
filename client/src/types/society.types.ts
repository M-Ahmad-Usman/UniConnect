import type { MembershipRequestStatus, SocietyStatus, UserType } from './enums';
import type { PaginationParams } from './api.types';
import type { SocietyPermissions } from './permission.types';

export interface SocietyListItem {
  publicId: string;
  name: string;
  description: string | null;
  departmentId: number;
  status: SocietyStatus;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  department: { id: number; name: string };
  president: { user: { publicId: string; fullName: string; email: string } };
  convenor: { user: { publicId: string; fullName: string; email: string } };
  server: {
    publicId: string;
    _count: { memberships: number };
  };
}

export interface SocietyDetail extends SocietyListItem {
  viewer: {
    isMember: boolean;
    requestStatus: MembershipRequestStatus | null;
  };
  permissions: SocietyPermissions;
}

export interface SocietyMembershipRequest {
  id: number;
  status: MembershipRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  society: { publicId: string };
  user: { publicId: string; fullName: string; email: string; profilePictureUrl: string | null };
  reviewer: { publicId: string; fullName: string } | null;
}

export interface SocietyMember {
  joinedAt: string;
  isAutoJoined: boolean;
  badges: string[];
  user: {
    publicId: string;
    fullName: string;
    email: string;
    userType: UserType;
    profilePictureUrl: string | null;
  };
}

export interface SocietyMembershipStatus {
  isMember: boolean;
  requestStatus: MembershipRequestStatus | null;
  requestedAt: string | null;
  reviewedAt: string | null;
}

export interface SocietyListParams extends PaginationParams {
  departmentId?: number;
  status?: SocietyStatus;
  lifecycle?: 'live' | 'deleted' | 'all';
}

export interface SocietyRequestListParams extends PaginationParams {
  status?: MembershipRequestStatus;
}

export interface SocietyCandidateParams extends PaginationParams {
  search?: string;
}

export interface SocietyLeadershipCandidateParams extends PaginationParams {
  departmentId: number;
  role: 'president' | 'convenor';
  search?: string;
}

export type SocietyLeadershipConflictAction = 'activate' | 'restore';

export interface SocietyLeadershipConflict {
  role: 'president' | 'convenor';
  userPublicId: string;
  fullName: string;
  conflictingSocietyPublicId: string;
  conflictingSocietyName: string;
}

export interface SocietyLeadershipConflictResult {
  hasConflicts: boolean;
  conflicts: SocietyLeadershipConflict[];
}

export interface CreateSocietyRequest {
  name: string;
  description?: string;
  departmentId: number;
  presidentPublicId: string;
  convenorPublicId: string;
}

export interface UpdateSocietyRequest {
  name?: string;
  description?: string;
  presidentPublicId?: string;
  convenorPublicId?: string;
}

export interface SocietyLifecycleReasonRequest {
  reason?: string;
}

export interface UpdateSocietyStatusRequest extends SocietyLifecycleReasonRequest {
  status: SocietyStatus;
}

export interface SocietyDeletionImpact {
  canDelete: boolean;
  activeMemberCount: number;
  liveChannelCount: number;
  pendingRequestCount: number;
  preservedPostCount: number;
  preservedPlatformRoleAssignmentCount: number;
}
