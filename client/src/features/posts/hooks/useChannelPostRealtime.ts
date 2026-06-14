import { useEffect } from 'react';
import type { InfiniteData } from '@tanstack/react-query';
import { connectSocket, getSocket } from '@/lib/socket';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import type { PaginatedResponse, PostDeletedPayload, PostListItem, PostRealtimePayload } from '@/types';
import {
  detailToListItem,
  removePostFromInfiniteData,
  replacePostInInfiniteData,
  upsertPostInInfiniteData,
} from '../utils';

export function useChannelPostRealtime(channelPublicId: string | null) {
  useEffect(() => {
    if (channelPublicId === null) {
      return;
    }

    connectSocket();
    const socket = getSocket();
    if (!socket) {
      return;
    }

    const channelQueryKey = ['posts', channelPublicId] as const;

    const updateChannelQueries = (
      updater: (
        current: InfiniteData<PaginatedResponse<PostListItem>> | undefined,
      ) => InfiniteData<PaginatedResponse<PostListItem>> | undefined,
    ) => {
      const entries = queryClient.getQueriesData<InfiniteData<PaginatedResponse<PostListItem>>>(
        { queryKey: channelQueryKey },
      );

      entries.forEach(([key]) => {
        const queryKey = key as unknown[];
        const params = queryKey[2] as Record<string, unknown> | undefined;
        const filters = { ...(params ?? {}) };
        delete filters.limit;
        delete filters.page;
        const hasFilters = Object.keys(filters).length > 0;

        if (hasFilters) {
          void queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
          return;
        }

        queryClient.setQueryData<InfiniteData<PaginatedResponse<PostListItem>>>(
          queryKey,
          (current) => updater(current),
        );
      });
    };

    const joinChannel = () => {
      socket.emit('channel:join', { channelPublicId });
    };

    joinChannel();
    socket.on('connect', joinChannel);

    const handleCreated = (payload: PostRealtimePayload) => {
      if (payload.channelPublicId !== channelPublicId) {
        return;
      }

      const listItem = detailToListItem(payload.post);
      updateChannelQueries((current) => upsertPostInInfiniteData(current, listItem));
      queryClient.setQueryData(queryKeys.posts.detail(payload.post.publicId), payload.post);
    };

    const handleUpdated = (payload: PostRealtimePayload) => {
      if (payload.channelPublicId !== channelPublicId) {
        return;
      }

      const listItem = detailToListItem(payload.post);
      updateChannelQueries((current) => replacePostInInfiniteData(current, listItem));
      queryClient.setQueryData(queryKeys.posts.detail(payload.post.publicId), payload.post);
    };

    const handlePinned = (payload: PostRealtimePayload) => {
      handleUpdated(payload);
    };

    const handleDeleted = (payload: PostDeletedPayload) => {
      if (payload.channelPublicId !== channelPublicId) {
        return;
      }

      updateChannelQueries((current) =>
        removePostFromInfiniteData(current, payload.postPublicId),
      );
      queryClient.removeQueries({ queryKey: queryKeys.posts.detail(payload.postPublicId) });
    };

    socket.on('post:created', handleCreated);
    socket.on('post:updated', handleUpdated);
    socket.on('post:pinned', handlePinned);
    socket.on('post:deleted', handleDeleted);

    return () => {
      socket.off('connect', joinChannel);
      socket.off('post:created', handleCreated);
      socket.off('post:updated', handleUpdated);
      socket.off('post:pinned', handlePinned);
      socket.off('post:deleted', handleDeleted);
      socket.emit('channel:leave', { channelPublicId });
    };
  }, [channelPublicId]);
}
