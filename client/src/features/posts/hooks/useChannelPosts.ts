import { useInfiniteQuery } from '@tanstack/react-query';
import { postsApi } from '@/api/endpoints/posts.api';
import { DEFAULT_PAGE_SIZE, queryKeys } from '@/lib/constants';
import type { PostListParams } from '@/types';
import { normalizePostListParams, toQueryParamsRecord } from '../utils';

export function useChannelPosts(channelId: number | null, params?: PostListParams) {
  const normalizedParams = normalizePostListParams({
    limit: DEFAULT_PAGE_SIZE,
    ...params,
  });

  return useInfiniteQuery({
    queryKey:
      channelId !== null
        ? queryKeys.posts.byChannel(channelId, toQueryParamsRecord(normalizedParams))
        : ['posts', 'idle'],
    queryFn: ({ pageParam }) =>
      postsApi.listByChannel(channelId as number, {
        ...normalizedParams,
        page: pageParam,
      }),
    initialPageParam: normalizedParams?.page ?? 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page >= lastPage.pagination.totalPages) {
        return undefined;
      }

      return lastPage.pagination.page + 1;
    },
    enabled: channelId !== null,
    refetchOnMount: 'always',
  });
}
