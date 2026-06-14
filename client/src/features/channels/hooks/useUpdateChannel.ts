import { useMutation } from '@tanstack/react-query';
import { channelsApi } from '@/api/endpoints/channels.api';
import { queryClient } from '@/lib/query-client';
import { updateChannelInList } from '@/features/channels/utils';
import type { ChannelListItem } from '@/types';
import type { ApiError, UpdateChannelRequest } from '@/types';

interface UpdateChannelInput {
  channelPublicId: string;
  payload: UpdateChannelRequest;
}

export function useUpdateChannel(serverPublicId: string) {
  const channelQueryKey = ['servers', serverPublicId, 'channels'] as const;

  return useMutation({
    mutationFn: ({ channelPublicId, payload }: UpdateChannelInput) =>
      channelsApi.updateChannel(channelPublicId, payload),
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

export type UpdateChannelError = ApiError;
