import type { NotificationScopeType, NotificationType, ServerType } from './enums';

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
    channel: {
      name: string;
      serverId: number;
    };
  } | null;
}

// ─── Notification Preference ────────────────────────────────────────────────

export interface NotificationPreference {
  id: number;
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
  isSubscribed: boolean;
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
    channel: {
      name: string;
      serverId: number;
    };
  } | null;
}

export interface UnreadCountPayload {
  count: number;
}
