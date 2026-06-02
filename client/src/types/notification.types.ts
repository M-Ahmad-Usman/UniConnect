import type { NotificationScopeType, NotificationType, PostPriority, ServerType } from './enums';

export type NotificationPreferenceType = Extract<NotificationType, 'NEW_POST' | 'ROLE_ASSIGNED'>;

// ─── Notification ───────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  postPublicId: string | null;
  post: {
    channelPublicId: string;
    priority: PostPriority;
    channel: {
      name: string;
      serverPublicId: string;
      server?: {
        name: string;
      };
    };
  } | null;
  society: {
    publicId: string;
    name: string;
    isDeleted: boolean;
  } | null;
}

// ─── Notification Preference ────────────────────────────────────────────────

export interface NotificationPreference {
  id: number;
  notificationType: NotificationPreferenceType;
  scopeType: NotificationScopeType;
  serverPublicId: string;
  channelPublicId: string | null;
  isSubscribed: boolean;
  updatedAt: string;
  server: {
    publicId: string;
    name: string;
    type: ServerType;
  };
  channel: {
    publicId: string;
    name: string;
  } | null;
}

export interface UpdatePreferenceRequest {
  notificationType: NotificationPreferenceType;
  scopeType: NotificationScopeType;
  serverPublicId: string;
  channelPublicId?: string;
  isSubscribed: boolean;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
}

export interface NotificationPreferenceListParams {
  serverPublicId?: string;
  notificationType?: NotificationPreferenceType;
}

// ─── Unread Count ───────────────────────────────────────────────────────────

export interface UnreadCountResponse {
  count: number;
}

// ─── Socket Event Payloads ──────────────────────────────────────────────────

export interface NewNotificationPayload {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  postPublicId: string | null;
  createdAt: string;
  post: {
    channelPublicId: string;
    priority: PostPriority;
    channel: {
      name: string;
      serverPublicId: string;
      server?: {
        name: string;
      };
    };
  } | null;
  society: {
    publicId: string;
    name: string;
    isDeleted: boolean;
  } | null;
}

export interface UnreadCountPayload {
  count: number;
}

export interface DeletedNotificationPayload {
  postPublicId: string;
  notificationIds: number[];
}
