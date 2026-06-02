import type { ChannelType } from './enums';

// ─── Channel ────────────────────────────────────────────────────────────────

export interface Channel {
  publicId: string;
  name: string;
  description: string | null;
  type: ChannelType;
  serverPublicId: string;
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
  publicId: string;
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
  publicId: string;
  serverPublicId: string;
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
  publicId: string;
  serverPublicId: string;
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
