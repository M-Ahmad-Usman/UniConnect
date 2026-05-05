import type { InfiniteData } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/api/endpoints/posts.api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import type { PaginatedResponse, PostListItem } from '@/types';
import { detailToListItem, replacePostInInfiniteData } from '../utils';

interface PinPostInput {
  postId: number;
  isPinned: boolean;
}

export function usePinPost(channelId: number) {
  const channelPostQueryKey = ['posts', channelId] as const;

  return useMutation({
    mutationFn: ({ postId, isPinned }: PinPostInput) => postsApi.pin(postId, isPinned),
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: (post) => {
      const listItem = detailToListItem(post);

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<PostListItem>>>(
        { queryKey: channelPostQueryKey },
        (current) => replacePostInInfiniteData(current, listItem),
      );
      queryClient.setQueryData(queryKeys.posts.detail(post.id), post);

      void queryClient.invalidateQueries({ queryKey: channelPostQueryKey });
      toast.success(post.isPinned ? 'Post pinned' : 'Post unpinned');
    },
  });
}
