import { useQuery } from '@tanstack/react-query';
import { postsApi } from '@/api/endpoints/posts.api';
import { queryKeys } from '@/lib/constants';

export function usePost(postPublicId: string | null) {
  return useQuery({
    queryKey:
      postPublicId !== null ? queryKeys.posts.detail(postPublicId) : ['posts', 'detail', 'idle'],
    queryFn: () => postsApi.get(postPublicId as string),
    enabled: postPublicId !== null,
  });
}
