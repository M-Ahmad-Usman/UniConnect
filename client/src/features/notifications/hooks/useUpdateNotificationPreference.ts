import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationsApi } from '@/api/endpoints/notifications.api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import type { NotificationPreference, UpdatePreferenceRequest } from '@/types';

function upsertPreference(
  current: NotificationPreference[] | undefined,
  next: NotificationPreference,
) {
  if (!current) {
    return current;
  }

  const exists = current.some((preference) => preference.id === next.id);

  if (exists) {
    return current.map((preference) => (preference.id === next.id ? next : preference));
  }

  return [...current, next];
}

export function useUpdateNotificationPreference() {
  return useMutation({
    mutationFn: (payload: UpdatePreferenceRequest) => notificationsApi.updatePreference(payload),
    meta: {
      suppressErrorToast: true,
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.preferencesRoot() });

      return {
        previous: queryClient.getQueriesData<NotificationPreference[]>({
          queryKey: queryKeys.notifications.preferencesRoot(),
        }),
      };
    },
    onSuccess: (preference) => {
      queryClient.setQueriesData<NotificationPreference[]>(
        { queryKey: queryKeys.notifications.preferencesRoot() },
        (current) => upsertPreference(current, preference),
      );
      toast.success(preference.isSubscribed ? 'Notifications enabled' : 'Notifications muted');
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      toast.error('Unable to update notification preference right now.');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferencesRoot() });
    },
  });
}
