import { useInfiniteQuery } from '@tanstack/react-query';
import { postsApi } from '@/api/endpoints/posts.api';
import { DEFAULT_PAGE_SIZE, queryKeys } from '@/lib/constants';
import type { PostListParams } from '@/types';
import { normalizePostListParams, toQueryParamsRecord } from '../utils';

export function useChannelPosts(channelPublicId: string | null, params?: PostListParams) {
  const normalizedParams = normalizePostListParams({
    limit: DEFAULT_PAGE_SIZE,
    ...params,
  });

  return useInfiniteQuery({
    queryKey:
      channelPublicId !== null
        ? queryKeys.posts.byChannel(channelPublicId, toQueryParamsRecord(normalizedParams))
        : ['posts', 'idle'],
    queryFn: ({ pageParam }) =>
      postsApi.listByChannel(channelPublicId as string, {
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
    enabled: channelPublicId !== null,
    refetchOnMount: 'always',
  });
}
