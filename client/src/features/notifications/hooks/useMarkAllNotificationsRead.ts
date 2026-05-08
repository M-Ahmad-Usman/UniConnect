import { useMutation } from '@tanstack/react-query';
import { notificationsApi } from '@/api/endpoints/notifications.api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import { useNotificationStore } from '@/stores/notification.store';
import { markAllNotificationsReadInCache } from '../cache';

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    meta: {
      suppressErrorToast: true,
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all() });

      const previousNotifications = queryClient.getQueriesData({
        queryKey: queryKeys.notifications.all(),
      });
      const previousUnreadCount = useNotificationStore.getState().unreadCount;

      markAllNotificationsReadInCache();
      useNotificationStore.getState().setUnreadCount(0);

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_error, _variables, context) => {
      context?.previousNotifications.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      useNotificationStore.getState().setUnreadCount(context?.previousUnreadCount ?? 0);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
}
