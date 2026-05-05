import type { InfiniteData } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/api/endpoints/posts.api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import type { PaginatedResponse, PostListItem } from '@/types';
import { removePostFromInfiniteData } from '../utils';

export function useDeletePost(channelId: number) {
  const channelPostQueryKey = ['posts', channelId] as const;

  return useMutation({
    mutationFn: (postId: number) => postsApi.delete(postId).then(() => postId),
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: (postId) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<PostListItem>>>(
        { queryKey: channelPostQueryKey },
        (current) => removePostFromInfiniteData(current, postId),
      );
      queryClient.removeQueries({ queryKey: queryKeys.posts.detail(postId) });

      void queryClient.invalidateQueries({ queryKey: channelPostQueryKey });
      toast.success('Post deleted');
    },
  });
}
