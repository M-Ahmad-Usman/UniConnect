import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/endpoints/notifications.api';
import { queryKeys } from '@/lib/constants';
import { useNotificationStore } from '@/stores/notification.store';

export function useUnreadCount() {
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const query = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: notificationsApi.getUnreadCount,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      setUnreadCount(query.data.count);
    }
  }, [query.data, setUnreadCount]);

  return query;
}