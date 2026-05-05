import { MoreHorizontal, PencilLine, Pin, PinOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getApiErrorMessage } from '@/features/auth/utils';
import type { PostDetail, PostListItem } from '@/types';
import { useDeletePost } from '../hooks/useDeletePost';
import { usePinPost } from '../hooks/usePinPost';
import { useCanDeletePost, useCanEditPost } from '../hooks/usePostPermissions';
import { getEditWindowState } from '../utils';
import { EditPostDialog } from './EditPostDialog';

interface PostActionsProps {
  channelId: number;
  post: PostDetail | PostListItem;
  canPin: boolean;
  onDeleted?: () => void;
}

export function PostActions({ channelId, post, canPin, onDeleted }: PostActionsProps) {
  const deletePost = useDeletePost(channelId);
  const pinPost = usePinPost(channelId);
  const canEdit = useCanEditPost(post);
  const canDelete = useCanDeletePost(post);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const pending = deletePost.isPending || pinPost.isPending;
  const editWindow = getEditWindowState(post.createdAt);

  async function handleDelete() {
    try {
      await deletePost.mutateAsync(post.id);
      onDeleted?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to delete this post right now.'));
    }
  }

  async function handlePinToggle() {
    try {
      await pinPost.mutateAsync({ postId: post.id, isPinned: !post.isPinned });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update this post pin right now.'));
    }
  }

  if (!canEdit && !canDelete && !canPin) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Open post actions" />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-52">
          {canEdit ? (
            <>
              <DropdownMenuItem disabled={pending} onClick={() => setEditOpen(true)}>
                <PencilLine className="size-4" />
                Edit post
              </DropdownMenuItem>
              <div className="px-1.5 pb-1 text-[11px] text-muted-foreground">
                {editWindow.remainingLabel}
              </div>
            </>
          ) : null}

          <DropdownMenuItem disabled={!canPin || pending} onClick={() => setPinOpen(true)}>
            {post.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            {post.isPinned ? 'Unpin post' : 'Pin post'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            disabled={!canDelete || pending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditPostDialog
        key={`${post.id}-${editOpen ? 'open' : 'closed'}`}
        channelId={channelId}
        post={post}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete post"
        description={`Delete "${post.title}"? This removes it from the channel feed.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        title={post.isPinned ? 'Unpin post' : 'Pin post'}
        description={
          post.isPinned
            ? 'This post will return to chronological ordering.'
            : 'This post will move into the pinned section at the top of the feed.'
        }
        confirmLabel={post.isPinned ? 'Unpin' : 'Pin'}
        onConfirm={handlePinToggle}
      />
    </>
  );
}
