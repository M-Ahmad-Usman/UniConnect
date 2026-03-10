import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/endpoints/notifications.api';
import { queryKeys } from '@/lib/constants';

export function useNotificationPreview(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.notifications.preview(),
    queryFn: () => notificationsApi.list({ page: 1, limit: 6 }),
    enabled,
  });
}