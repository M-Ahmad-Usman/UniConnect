import type { MembershipRequestStatus, UserType } from './enums';
import type { PaginationParams } from './api.types';
import type { SocietyPermissions } from './permission.types';

// ─── Society List Item ──────────────────────────────────────────────────────

export interface SocietyListItem {
  id: number;
  name: string;
  description: string | null;
  departmentId: number;
  isActive: boolean;
  createdAt: string;
  department: { id: number; name: string; serverId: number };
  president: { user: { id: number; fullName: string; email: string } };
  convenor: { user: { id: number; fullName: string; email: string } };
  server: {
    _count: { memberships: number };
  };
}

// ─── Society Detail ─────────────────────────────────────────────────────────

export interface SocietyDetail extends SocietyListItem {
  serverId: number;
  server: {
    id: number;
    _count: { memberships: number };
  };
  viewer: {
    isMember: boolean;
    requestStatus: MembershipRequestStatus | null;
  };
  permissions: SocietyPermissions;
}

// ─── Society Membership Request ─────────────────────────────────────────────

export interface SocietyMembershipRequest {
  id: number;
  societyId: number;
  userId: number;
  status: MembershipRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  user: { id: number; fullName: string; email: string; profilePictureUrl: string | null };
  reviewer: { id: number; fullName: string } | null;
}

export interface SocietyMember {
  userId: number;
  joinedAt: string;
  isAutoJoined: boolean;
  badges: string[];
  user: {
    id: number;
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
}

export interface SocietyRequestListParams extends PaginationParams {
  status?: MembershipRequestStatus;
}

export interface SocietyCandidateParams extends PaginationParams {
  search?: string;
}

// ─── Create / Update Society ────────────────────────────────────────────────

export interface CreateSocietyRequest {
  name: string;
  description?: string;
  departmentId: number;
  presidentId: number;
  convenorId: number;
}

export interface UpdateSocietyRequest {
  name?: string;
  description?: string;
  presidentId?: number;
  convenorId?: number;
}
