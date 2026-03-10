import { useMutation } from '@tanstack/react-query';
import { notificationsApi } from '@/api/endpoints/notifications.api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import { useNotificationStore } from '@/stores/notification.store';
import type { Notification, PaginatedResponse } from '@/types';

function updateNotificationCollection(
  previous: PaginatedResponse<Notification> | undefined,
  notificationId: number,
) {
  if (!previous) {
    return previous;
  }

  return {
    ...previous,
    data: previous.data.map((notification) =>
      notification.id === notificationId && notification.readAt === null
        ? { ...notification, readAt: new Date().toISOString() }
        : notification,
    ),
  };
}

export function useMarkNotificationRead() {
  const decrementUnread = useNotificationStore((state) => state.decrementUnread);

  function findNotification(
    preview: PaginatedResponse<Notification> | undefined,
    list: PaginatedResponse<Notification> | undefined,
    notificationId: number,
  ) {
    return (
      preview?.data.find((notification) => notification.id === notificationId) ??
      list?.data.find((notification) => notification.id === notificationId) ??
      null
    );
  }

  return useMutation({
    mutationFn: notificationsApi.markRead,
    meta: {
      suppressErrorToast: true,
    },
    onMutate: async (notificationId: number) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.preview() });
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.list() });

      const previousPreview = queryClient.getQueryData<PaginatedResponse<Notification>>(
        queryKeys.notifications.preview(),
      );
      const previousList = queryClient.getQueryData<PaginatedResponse<Notification>>(
        queryKeys.notifications.list(),
      );
      const targetNotification = findNotification(previousPreview, previousList, notificationId);

      queryClient.setQueryData(
        queryKeys.notifications.preview(),
        updateNotificationCollection(previousPreview, notificationId),
      );
      queryClient.setQueryData(
        queryKeys.notifications.list(),
        updateNotificationCollection(previousList, notificationId),
      );

      if (targetNotification?.readAt === null) {
        decrementUnread();
      }

      return { previousPreview, previousList, shouldRestoreUnread: targetNotification?.readAt === null };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousPreview) {
        queryClient.setQueryData(queryKeys.notifications.preview(), context.previousPreview);
      }

      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.notifications.list(), context.previousList);
      }

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