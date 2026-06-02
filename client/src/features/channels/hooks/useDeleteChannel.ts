import { useMutation } from '@tanstack/react-query';
import { channelsApi } from '@/api/endpoints/channels.api';
import { queryKeys } from '@/lib/constants';
import { queryClient } from '@/lib/query-client';
import { removeChannelFromList } from '@/features/channels/utils';
import type { ChannelListItem, ServerDetail } from '@/types';
import type { ApiError } from '@/types';

export function useDeleteChannel(serverPublicId: string) {
  const channelQueryKey = ['servers', serverPublicId, 'channels'] as const;

  return useMutation({
    mutationFn: (channelPublicId: string) => channelsApi.deleteChannel(channelPublicId),
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: (_, channelPublicId) => {
      queryClient.setQueriesData<ChannelListItem[]>({ queryKey: channelQueryKey }, (current) =>
        current ? removeChannelFromList(current, channelPublicId) : current,
      );
      queryClient.setQueryData<ServerDetail>(queryKeys.servers.detail(serverPublicId), (current) =>
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.detail(serverPublicId) });
      void queryClient.removeQueries({ queryKey: ['posts', channelPublicId] });
    },
  });
}

export type DeleteChannelError = ApiError;
