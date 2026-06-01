import type {
  Notification,
  NotificationListParams,
  NotificationPreference,
  NotificationPreferenceType,
} from '@/types';
import { NotificationScopeType, NotificationType } from '@/types';
import { ROUTES } from '@/lib/constants';

export function toNotificationQueryParamsRecord(params?: NotificationListParams) {
  if (!params) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Record<string, unknown>;
}

export function getNotificationTarget(notification: Notification) {
  if (notification.type === NotificationType.ROLE_ASSIGNED) {
    const serverId = notification.post?.channel.serverId;
    return serverId ? ROUTES.SERVER_NOTIFICATION_SETTINGS(serverId) : ROUTES.PROFILE;
  }

  if (
    notification.type === NotificationType.SOCIETY_REQUEST_REVIEWED ||
    notification.type === NotificationType.SOCIETY_SUSPENDED ||
    notification.type === NotificationType.SOCIETY_ACTIVATED ||
    notification.type === NotificationType.SOCIETY_DELETED ||
    notification.type === NotificationType.SOCIETY_RESTORED
  ) {
    return notification.society && !notification.society.isDeleted
      ? ROUTES.SOCIETY(notification.society.publicId)
      : ROUTES.SOCIETIES;
  }

  const serverId = notification.post?.channel.serverId;
  const channelId = notification.post?.channelId;

  if (serverId && channelId) {
    return ROUTES.CHANNEL(serverId, channelId);
  }

  return ROUTES.NOTIFICATIONS;
}

export function findPreference(
  preferences: NotificationPreference[] | undefined,
  match: {
    notificationType: NotificationPreferenceType;
    scopeType: NotificationScopeType;
    serverId: number;
    channelId?: number | null;
  },
) {
  return (
    preferences?.find(
      (preference) =>
        preference.notificationType === match.notificationType &&
        preference.scopeType === match.scopeType &&
        preference.serverId === match.serverId &&
        preference.channelId === (match.channelId ?? null),
    ) ?? null
  );
}

export function isSubscribed(preference: NotificationPreference | null) {
  return preference?.isSubscribed ?? true;
}

export function getPostServerPreference(
  preferences: NotificationPreference[] | undefined,
  serverId: number,
) {
  return findPreference(preferences, {
    notificationType: NotificationType.NEW_POST,
    scopeType: NotificationScopeType.SERVER,
    serverId,
  });
}

export function getPostChannelPreference(
  preferences: NotificationPreference[] | undefined,
  serverId: number,
  channelId: number,
) {
  return findPreference(preferences, {
    notificationType: NotificationType.NEW_POST,
    scopeType: NotificationScopeType.CHANNEL,
    serverId,
    channelId,
  });
}

export function getRoleServerPreference(
  preferences: NotificationPreference[] | undefined,
  serverId: number,
) {
  return findPreference(preferences, {
    notificationType: NotificationType.ROLE_ASSIGNED,
    scopeType: NotificationScopeType.SERVER,
    serverId,
  });
}
