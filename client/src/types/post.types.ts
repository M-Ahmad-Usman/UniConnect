import type { PostPriority } from './enums';

// ─── Post Author ────────────────────────────────────────────────────────────

export interface PostAuthor {
  id: number;
  fullName: string;
  email: string;
  userType: string;
  profilePictureUrl: string | null;
  badges: string[];
}

// ─── Post Attachment ────────────────────────────────────────────────────────

export interface PostAttachment {
  id: number;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

// ─── Post List Item (feed) ──────────────────────────────────────────────────

export interface PostListItem {
  id: number;
  title: string;
  content: string;
  priority: PostPriority;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  author: PostAuthor;
  attachments: PostAttachment[];
  _count: {
    attachments: number;
  };
}

// ─── Post Detail ────────────────────────────────────────────────────────────

export interface PostDetail {
  id: number;
  title: string;
  content: string;
  priority: PostPriority;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  author: PostAuthor;
  attachments: PostAttachment[];
  pinner: { id: number; fullName: string } | null;
}

// ─── Create / Update Post ───────────────────────────────────────────────────

export interface CreatePostRequest {
  title: string;
  content: string;
  priority?: PostPriority;
  attachments?: File[];
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  priority?: PostPriority;
}

// ─── Post List Params ───────────────────────────────────────────────────────

export interface PostListParams {
  page?: number;
  limit?: number;
  search?: string;
  priority?: PostPriority;
  startDate?: string;
  endDate?: string;
}

// ─── Socket Event Payloads ────────────────────────────────────────────────

export interface PostRealtimePayload {
  channelId: number;
  post: PostDetail;
}

export interface PostDeletedPayload {
  channelId: number;
  postId: number;
}
