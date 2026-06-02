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
    const serverPublicId = notification.post?.channel.serverPublicId;
    return serverPublicId
      ? ROUTES.SERVER_NOTIFICATION_SETTINGS(serverPublicId)
      : ROUTES.PROFILE;
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

  const serverPublicId = notification.post?.channel.serverPublicId;
  const channelPublicId = notification.post?.channelPublicId;

  if (serverPublicId && channelPublicId) {
    return ROUTES.CHANNEL(serverPublicId, channelPublicId);
  }

  return ROUTES.NOTIFICATIONS;
}

export function findPreference(
  preferences: NotificationPreference[] | undefined,
  match: {
    notificationType: NotificationPreferenceType;
    scopeType: NotificationScopeType;
    serverPublicId: string;
    channelPublicId?: string | null;
  },
) {
  return (
    preferences?.find(
      (preference) =>
        preference.notificationType === match.notificationType &&
        preference.scopeType === match.scopeType &&
        preference.serverPublicId === match.serverPublicId &&
        preference.channelPublicId === (match.channelPublicId ?? null),
    ) ?? null
  );
}

export function isSubscribed(preference: NotificationPreference | null) {
  return preference?.isSubscribed ?? true;
}

export function getPostServerPreference(
  preferences: NotificationPreference[] | undefined,
  serverPublicId: string,
) {
  return findPreference(preferences, {
    notificationType: NotificationType.NEW_POST,
    scopeType: NotificationScopeType.SERVER,
    serverPublicId,
  });
}

export function getPostChannelPreference(
  preferences: NotificationPreference[] | undefined,
  serverPublicId: string,
  channelPublicId: string,
) {
  return findPreference(preferences, {
    notificationType: NotificationType.NEW_POST,
    scopeType: NotificationScopeType.CHANNEL,
    serverPublicId,
    channelPublicId,
  });
}

export function getRoleServerPreference(
  preferences: NotificationPreference[] | undefined,
  serverPublicId: string,
) {
  return findPreference(preferences, {
    notificationType: NotificationType.ROLE_ASSIGNED,
    scopeType: NotificationScopeType.SERVER,
    serverPublicId,
  });
}
