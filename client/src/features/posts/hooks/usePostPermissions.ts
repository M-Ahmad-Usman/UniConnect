import { useMemo } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import type { ChannelListItem, PostDetail, PostListItem, ServerDetail } from '@/types';
import { canDeletePostClient, canEditPostClient, canPostInChannelClient } from '../utils';

export function useCanPostInChannel(
  server: ServerDetail | null | undefined,
  channel: ChannelListItem | null | undefined,
) {
  const user = useAuthStore((state) => state.user);

  return useMemo(
    () => canPostInChannelClient({ user, server, channel }),
    [channel, server, user],
  );
}

export function useCanManagePostPin(serverId: number | null) {
  const permissions = usePermissions(serverId);
  return permissions.canLockChannels;
}

export function useCanEditPost(post: Pick<PostListItem | PostDetail, 'author' | 'createdAt'>) {
  const user = useAuthStore((state) => state.user);
  return canEditPostClient(post, user);
}

export function useCanDeletePost(post: Pick<PostListItem | PostDetail, 'author'>) {
  const user = useAuthStore((state) => state.user);
  return canDeletePostClient(post, user);
}
