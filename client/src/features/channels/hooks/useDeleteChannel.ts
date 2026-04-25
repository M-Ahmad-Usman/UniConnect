import { useMutation } from '@tanstack/react-query';
import { channelsApi } from '@/api/endpoints/channels.api';
import { queryKeys } from '@/lib/constants';
import { queryClient } from '@/lib/query-client';
import { removeChannelFromList } from '@/features/channels/utils';
import type { ChannelListItem, ServerDetail } from '@/types';
import type { ApiError } from '@/types';

export function useDeleteChannel(serverId: number) {
  const channelQueryKey = ['servers', serverId, 'channels'] as const;

  return useMutation({
    mutationFn: (channelId: number) => channelsApi.deleteChannel(channelId),
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: (_, channelId) => {
      queryClient.setQueriesData<ChannelListItem[]>({ queryKey: channelQueryKey }, (current) =>
        current ? removeChannelFromList(current, channelId) : current,
      );
      queryClient.setQueryData<ServerDetail>(queryKeys.servers.detail(serverId), (current) =>
        current
          ? {
              ...current,
              _count: {
                ...current._count,
                channels: Math.max(0, current._count.channels - 1),
              },
            }
          : current,
      );

      void queryClient.invalidateQueries({ queryKey: channelQueryKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.detail(serverId) });
      void queryClient.removeQueries({ queryKey: ['posts', channelId] });
    },
  });
}

export type DeleteChannelError = ApiError;
