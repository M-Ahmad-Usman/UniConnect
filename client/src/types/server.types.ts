import type { ServerType } from './enums';

// ─── Server List Item ───────────────────────────────────────────────────────

export interface ServerListItem {
  id: number;
  name: string;
  description: string | null;
  type: ServerType;
  iconUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Server Detail ──────────────────────────────────────────────────────────

export interface ServerDetail {
  id: number;
  name: string;
  description: string | null;
  type: ServerType;
  iconUrl: string | null;
  isActive: boolean;
  createdAt: string;
  department: {
    id: number;
    name: string;
    code: string;
  } | null;
  class: {
    id: number;
    currentSemester: number;
    section: string;
    program: {
      id: number;
      code: string;
      discipline: { name: string };
      degreeLevel: { level: string };
    };
  } | null;
  society: {
    id: number;
    name: string;
  } | null;
  _count: {
    memberships: number;
    channels: number;
  };
}

// ─── Server Member ──────────────────────────────────────────────────────────

export interface ServerMember {
  userId: number;
  joinedAt: string;
  isAutoJoined: boolean;
  badges: string[];
  user: {
    id: number;
    fullName: string;
    email: string;
    userType: string;
    profilePictureUrl: string | null;
  };
}
