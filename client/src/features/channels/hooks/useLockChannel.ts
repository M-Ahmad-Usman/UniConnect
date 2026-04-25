import { useMutation } from '@tanstack/react-query';
import { channelsApi } from '@/api/endpoints/channels.api';
import { queryClient } from '@/lib/query-client';
import { updateChannelInList } from '@/features/channels/utils';
import type { ChannelListItem } from '@/types';
import type { ApiError } from '@/types';

export function useLockChannel(serverId: number) {
  const channelQueryKey = ['servers', serverId, 'channels'] as const;

  return useMutation({
    mutationFn: (channelId: number) => channelsApi.lockChannel(channelId),
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: (channel) => {
      queryClient.setQueriesData<ChannelListItem[]>({ queryKey: channelQueryKey }, (current) =>
        current ? updateChannelInList(current, channel) : current,
      );

      void queryClient.invalidateQueries({ queryKey: channelQueryKey });
    },
  });
}

export type LockChannelError = ApiError;
