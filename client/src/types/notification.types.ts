import type { NotificationScopeType, NotificationType, PostPriority, ServerType } from './enums';

export type NotificationPreferenceType = Exclude<NotificationType, 'SOCIETY_REQUEST_REVIEWED'>;

// ─── Notification ───────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  postId: number | null;
  post: {
    channelId: number;
    priority: PostPriority;
    channel: {
      name: string;
      serverId: number;
    };
  } | null;
}

// ─── Notification Preference ────────────────────────────────────────────────

export interface NotificationPreference {
  id: number;
  notificationType: NotificationPreferenceType;
  scopeType: NotificationScopeType;
  serverId: number;
  channelId: number | null;
  isSubscribed: boolean;
  updatedAt: string;
  server: {
    name: string;
    type: ServerType;
  };
  channel: {
    name: string;
  } | null;
}

export interface UpdatePreferenceRequest {
  notificationType: NotificationPreferenceType;
  scopeType: NotificationScopeType;
  serverId: number;
  channelId?: number;
  isSubscribed: boolean;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
}

export interface NotificationPreferenceListParams {
  serverId?: number;
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
  postId: number | null;
  createdAt: string;
  post: {
    channelId: number;
    priority: PostPriority;
    channel: {
      name: string;
      serverId: number;
    };
  } | null;
}

export interface UnreadCountPayload {
  count: number;
}
