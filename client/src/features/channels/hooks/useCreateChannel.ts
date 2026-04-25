import { useMutation } from '@tanstack/react-query';
import { serversApi } from '@/api/endpoints/servers.api';
import { queryKeys } from '@/lib/constants';
import { queryClient } from '@/lib/query-client';
import { insertChannel } from '@/features/channels/utils';
import type { ChannelListItem, ServerDetail } from '@/types';
import type { ApiError, CreateChannelRequest } from '@/types';

export function useCreateChannel(serverId: number) {
  const channelQueryKey = ['servers', serverId, 'channels'] as const;

  return useMutation({
    mutationFn: (payload: CreateChannelRequest) => serversApi.createChannel(serverId, payload),
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: (channel) => {
      queryClient.setQueriesData<ChannelListItem[]>({ queryKey: channelQueryKey }, (current) =>
        current ? insertChannel(current, channel) : current,
      );
      queryClient.setQueryData<ServerDetail>(queryKeys.servers.detail(serverId), (current) =>
        current
          ? {
              ...current,
              _count: {
                ...current._count,
                channels: current._count.channels + 1,
              },
            }
          : current,
      );

      void queryClient.invalidateQueries({ queryKey: channelQueryKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.detail(serverId) });
    },
  });
}

export type CreateChannelError = ApiError;
