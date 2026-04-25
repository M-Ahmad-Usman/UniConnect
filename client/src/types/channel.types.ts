import type { ChannelType } from './enums';

// ─── Channel ────────────────────────────────────────────────────────────────

export interface Channel {
  id: number;
  name: string;
  description: string | null;
  type: ChannelType;
  serverId: number;
  isLocked: boolean;
  isArchived: boolean;
  isAutoCreated: boolean;
  isDeleted: boolean;
  courseId: number | null;
  programId: number | null;
  createdAt: string;
}

// ─── Channel List Item (from server channels list) ──────────────────────────

export interface ChannelListItem {
  id: number;
  name: string;
  description: string | null;
  type: ChannelType;
  isLocked: boolean;
  isArchived: boolean;
  isAutoCreated: boolean;
  courseId: number | null;
  programId: number | null;
  createdAt: string;
}

// ─── Create Channel ─────────────────────────────────────────────────────────

export interface CreateChannelRequest {
  name: string;
  description?: string;
}

export interface CreateChannelResponse {
  id: number;
  serverId: number;
  name: string;
  description: string | null;
  type: ChannelType;
  isLocked: boolean;
  isAutoCreated: boolean;
  createdAt: string;
}

// ─── Update Channel ─────────────────────────────────────────────────────────

export interface UpdateChannelRequest {
  name?: string;
  description?: string;
}

export interface UpdateChannelResponse {
  id: number;
  serverId: number;
  name: string;
  description: string | null;
  type: ChannelType;
  isLocked: boolean;
  isAutoCreated: boolean;
  isDeleted: boolean;
  isArchived: boolean;
  createdAt: string;
}

export type LockChannelResponse = UpdateChannelResponse;
export type UnlockChannelResponse = UpdateChannelResponse;
