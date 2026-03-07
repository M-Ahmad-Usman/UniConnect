import type { MembershipRequestStatus } from './enums';

// ─── Society List Item ──────────────────────────────────────────────────────

export interface SocietyListItem {
  id: number;
  name: string;
  description: string | null;
  departmentId: number;
  isActive: boolean;
  createdAt: string;
  department: { id: number; name: string };
  president: { user: { id: number; fullName: string; email: string } };
  convenor: { user: { id: number; fullName: string; email: string } };
}

// ─── Society Detail ─────────────────────────────────────────────────────────

export interface SocietyDetail extends SocietyListItem {
  serverId: number;
  server: {
    id: number;
    _count: { memberships: number };
  };
}

// ─── Society Membership Request ─────────────────────────────────────────────

export interface SocietyMembershipRequest {
  id: number;
  societyId: number;
  userId: number;
  status: MembershipRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  user: { id: number; fullName: string; email: string };
  reviewer: { id: number; fullName: string } | null;
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
