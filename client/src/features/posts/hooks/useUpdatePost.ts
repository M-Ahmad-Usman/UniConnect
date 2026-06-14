import type { InfiniteData } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/api/endpoints/posts.api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import type { PaginatedResponse, PostListItem, UpdatePostRequest } from '@/types';
import { detailToListItem, replacePostInInfiniteData } from '../utils';

interface UpdatePostInput {
  postPublicId: string;
  payload: UpdatePostRequest;
}

export function useUpdatePost(channelPublicId: string) {
  const channelPostQueryKey = ['posts', channelPublicId] as const;

  return useMutation({
    mutationFn: ({ postPublicId, payload }: UpdatePostInput) =>
      postsApi.update(postPublicId, payload),
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: (post) => {
      const listItem = detailToListItem(post);

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<PostListItem>>>(
        { queryKey: channelPostQueryKey },
        (current) => replacePostInInfiniteData(current, listItem),
      );
      queryClient.setQueryData(queryKeys.posts.detail(post.publicId), post);

      void queryClient.invalidateQueries({ queryKey: channelPostQueryKey });
      toast.success('Post updated');
    },
  });
}
