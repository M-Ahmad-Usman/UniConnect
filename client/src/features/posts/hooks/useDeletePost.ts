import type { InfiniteData } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/api/endpoints/posts.api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import type { PaginatedResponse, PostListItem } from '@/types';
import { removePostFromInfiniteData } from '../utils';

export function useDeletePost(channelPublicId: string) {
  const channelPostQueryKey = ['posts', channelPublicId] as const;

  return useMutation({
    mutationFn: (postPublicId: string) => postsApi.delete(postPublicId).then(() => postPublicId),
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: (postPublicId) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<PostListItem>>>(
        { queryKey: channelPostQueryKey },
        (current) => removePostFromInfiniteData(current, postPublicId),
      );
      queryClient.removeQueries({ queryKey: queryKeys.posts.detail(postPublicId) });

      void queryClient.invalidateQueries({ queryKey: channelPostQueryKey });
      toast.success('Post deleted');
    },
  });
}
