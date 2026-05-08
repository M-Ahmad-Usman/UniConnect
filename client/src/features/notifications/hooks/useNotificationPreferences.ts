import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/endpoints/notifications.api';
import { queryKeys } from '@/lib/constants';
import type { NotificationPreferenceListParams } from '@/types';

function toQueryParamsRecord(params?: NotificationPreferenceListParams) {
  if (!params) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Record<string, unknown>;
}

export function useNotificationPreferences(params?: NotificationPreferenceListParams) {
  return useQuery({
    queryKey: queryKeys.notifications.preferences(toQueryParamsRecord(params)),
    queryFn: () => notificationsApi.listPreferences(params),
  });
}
