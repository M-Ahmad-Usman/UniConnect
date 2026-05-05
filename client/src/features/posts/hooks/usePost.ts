import { useQuery } from '@tanstack/react-query';
import { postsApi } from '@/api/endpoints/posts.api';
import { queryKeys } from '@/lib/constants';

export function usePost(postId: number | null) {
  return useQuery({
    queryKey: postId !== null ? queryKeys.posts.detail(postId) : ['posts', 'detail', 'idle'],
    queryFn: () => postsApi.get(postId as number),
    enabled: postId !== null,
  });
}
