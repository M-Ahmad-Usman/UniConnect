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

export function markNotificationReadInCache(
  notificationId: number,
  readAt = new Date().toISOString(),
) {
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

export function removeNotificationsFromCache(notificationIds: number[]) {
  const ids = new Set(notificationIds);
  if (ids.size === 0) {
    return;
  }

  updateNotificationCollections((current) => {
    const nextData = current.data.filter((notification) => !ids.has(notification.id));
    const removedCount = current.data.length - nextData.length;

    return {
      ...current,
      data: nextData,
      pagination: {
        ...current.pagination,
        total: Math.max(0, current.pagination.total - removedCount),
      },
    };
  });
}
