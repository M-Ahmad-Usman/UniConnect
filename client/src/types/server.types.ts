import type { ServerType, UserType } from './enums';

// ─── Server List Item ───────────────────────────────────────────────────────

export interface ServerListItem {
  publicId: string;
  name: string;
  description: string | null;
  type: ServerType;
  iconUrl: string | null;
  createdAt: string;
  class: { status: 'ACTIVE' | 'GRADUATED' } | null;
}

// ─── Server Detail ──────────────────────────────────────────────────────────

export interface ServerDetail {
  publicId: string;
  name: string;
  description: string | null;
  type: ServerType;
  iconUrl: string | null;
  createdAt: string;
  department: {
    id: number;
    name: string;
    code: string;
  } | null;
  class: {
    publicId: string;
    currentSemester: number;
    status: 'ACTIVE' | 'GRADUATED';
    section: string;
    program: {
      id: number;
      code: string;
      discipline: { name: string };
      degreeLevel: { level: string };
    };
  } | null;
  society: {
    publicId: string;
    name: string;
  } | null;
  _count: {
    memberships: number;
    channels: number;
  };
}

// ─── Server Member ──────────────────────────────────────────────────────────

export interface ServerMember {
  joinedAt: string;
  isAutoJoined: boolean;
  badges: MemberBadge[];
  user: {
    publicId: string;
    fullName: string;
    email: string;
    userType: UserType;
    profilePictureUrl: string | null;
  };
}

export type MemberBadge =
  | 'hod'
  | 'program_director'
  | 'cr'
  | 'president'
  | 'convenor'
  | 'server_moderator'
  | 'channel_moderator';
