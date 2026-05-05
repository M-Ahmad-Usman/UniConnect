import type { InfiniteData } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/api/endpoints/posts.api';
import { queryClient } from '@/lib/query-client';
import type { CreatePostRequest, PaginatedResponse, PostListItem } from '@/types';
import { detailToListItem, upsertPostInInfiniteData } from '../utils';

export function useCreatePost(channelId: number) {
  const channelPostQueryKey = ['posts', channelId] as const;

  return useMutation({
    mutationFn: (payload: CreatePostRequest) => postsApi.create(channelId, payload),
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: (post) => {
      const listItem = detailToListItem(post);

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<PostListItem>>>(
        { queryKey: channelPostQueryKey },
        (current) => upsertPostInInfiniteData(current, listItem),
      );
      queryClient.setQueryData(['posts', 'detail', post.id], post);

      void queryClient.invalidateQueries({ queryKey: channelPostQueryKey });
      toast.success('Post published');
    },
  });
}
