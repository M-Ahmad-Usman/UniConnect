import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/endpoints/notifications.api';
import { queryKeys } from '@/lib/constants';
import type { NotificationListParams } from '@/types';
import { toNotificationQueryParamsRecord } from '../utils';

export function useNotifications(params: NotificationListParams) {
  return useQuery({
    queryKey: queryKeys.notifications.list(toNotificationQueryParamsRecord(params)),
    queryFn: () => notificationsApi.list(params),
  });
}
