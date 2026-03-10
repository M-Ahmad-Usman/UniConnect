import { useQuery } from '@tanstack/react-query';
import { postsApi } from '@/api/endpoints/posts.api';
import { queryKeys } from '@/lib/constants';
import type { PostListParams } from '@/types';
import { normalizePostListParams, toQueryParamsRecord } from '../utils';

export function useChannelPosts(channelId: number | null, params?: PostListParams) {
  const normalizedParams = normalizePostListParams(params);

  return useQuery({
    queryKey:
      channelId !== null
        ? queryKeys.posts.byChannel(channelId, toQueryParamsRecord(normalizedParams))
        : ['posts', 'idle'],
    queryFn: () => postsApi.listByChannel(channelId as number, normalizedParams),
    enabled: channelId !== null,
  });
}