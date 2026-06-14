import { useMutation } from '@tanstack/react-query';
import { notificationsApi } from '@/api/endpoints/notifications.api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import { useNotificationStore } from '@/stores/notification.store';
import type { Notification, PaginatedResponse } from '@/types';
import { markNotificationReadInCache } from '../cache';

export function useMarkNotificationRead() {
  const decrementUnread = useNotificationStore((state) => state.decrementUnread);

  function findNotification(
    preview: PaginatedResponse<Notification> | undefined,
    lists: Array<[unknown, PaginatedResponse<Notification> | undefined]>,
    notificationId: number,
  ) {
    const previewNotification = preview?.data.find((notification) => notification.id === notificationId);
    if (previewNotification) {
      return previewNotification;
    }

    for (const [, list] of lists) {
      const notification = list?.data.find((item) => item.id === notificationId);
      if (notification) {
        return notification;
      }
    }

    return null;
  }

  return useMutation({
    mutationFn: notificationsApi.markRead,
    meta: {
      suppressErrorToast: true,
    },
    onMutate: async (notificationId: number) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.preview() });
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all() });

      const previousPreview = queryClient.getQueryData<PaginatedResponse<Notification>>(
        queryKeys.notifications.preview(),
      );
      const previousLists = queryClient.getQueriesData<PaginatedResponse<Notification>>({
        queryKey: queryKeys.notifications.all(),
      });
      const targetNotification = findNotification(previousPreview, previousLists, notificationId);

      markNotificationReadInCache(notificationId);

      if (targetNotification?.readAt === null) {
        decrementUnread();
      }

      return { previousPreview, previousLists, shouldRestoreUnread: targetNotification?.readAt === null };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousPreview) {
        queryClient.setQueryData(queryKeys.notifications.preview(), context.previousPreview);
      }

      context?.previousLists.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });

      if (context?.shouldRestoreUnread) {
        useNotificationStore.getState().incrementUnread();
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
}
