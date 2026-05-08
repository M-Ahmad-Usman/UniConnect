import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import type { Notification, PaginatedResponse } from '@/types';

function isNotificationCollection(value: unknown): value is PaginatedResponse<Notification> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    Array.isArray((value as { data: unknown }).data) &&
    'pagination' in value
  );
}

export function updateNotificationCollections(
  updater: (current: PaginatedResponse<Notification>) => PaginatedResponse<Notification>,
) {
  const entries = queryClient.getQueriesData<unknown>({ queryKey: queryKeys.notifications.all() });

  entries.forEach(([key, value]) => {
    if (!isNotificationCollection(value)) {
      return;
    }

    queryClient.setQueryData(key, updater(value));
  });
}

export function markNotificationReadInCache(notificationId: number, readAt = new Date().toISOString()) {
  updateNotificationCollections((current) => ({
    ...current,
    data: current.data.map((notification) =>
      notification.id === notificationId && notification.readAt === null
        ? { ...notification, readAt }
        : notification,
    ),
  }));
}

export function markAllNotificationsReadInCache(readAt = new Date().toISOString()) {
  updateNotificationCollections((current) => ({
    ...current,
    data: current.data.map((notification) =>
      notification.readAt === null ? { ...notification, readAt } : notification,
    ),
  }));
}
