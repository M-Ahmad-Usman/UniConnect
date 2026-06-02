import { useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_TITLE_LENGTH } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { PostPriority, type PostDetail, type PostListItem, type PostPriority as PostPriorityType } from '@/types';
import { getApiErrorMessage } from '@/features/auth/utils';
import { updatePostSchema } from '../schemas';
import { getEditWindowState, priorityLabels } from '../utils';
import { useUpdatePost } from '../hooks/useUpdatePost';
import { PostEditor } from './PostEditor';

interface EditPostDialogProps {
  channelPublicId: string;
  post: PostDetail | PostListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorities = [PostPriority.NORMAL, PostPriority.IMPORTANT, PostPriority.URGENT] as const;

export function EditPostDialog({ channelPublicId, post, open, onOpenChange }: EditPostDialogProps) {
  const updatePost = useUpdatePost(channelPublicId);
  const [title, setTitle] = useState(() => post?.title ?? '');
  const [content, setContent] = useState(() => post?.content ?? '');
  const [plainText, setPlainText] = useState(() => post?.content.replace(/<[^>]*>/g, ' ').trim() ?? '');
  const [priority, setPriority] = useState<PostPriorityType>(() => post?.priority ?? PostPriority.NORMAL);
  const [errors, setErrors] = useState<string[]>([]);

  if (!post) {
    return null;
  }

  const editWindow = getEditWindowState(post.createdAt);
  const attachments = 'attachments' in post ? post.attachments : [];

  async function handleSubmit() {
    if (!post) {
      return;
    }

    const parsed = updatePostSchema.safeParse({
      title,
      content: plainText.trim() ? content : '',
      priority,
    });

    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    setErrors([]);
    try {
      await updatePost.mutateAsync({
        postPublicId: post.publicId,
        payload: parsed.data,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update this post right now.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" />
            Edit post
          </DialogTitle>
          <DialogDescription>Edit window {editWindow.remainingLabel}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="edit-post-title">Title</Label>
              <span className="text-xs text-muted-foreground">
                {title.length}/{MAX_TITLE_LENGTH}
              </span>
            </div>
            <Input
              id="edit-post-title"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              disabled={updatePost.isPending}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="grid grid-cols-3 gap-2">
              {priorities.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={updatePost.isPending}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm transition-colors',
                    priority === item
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background hover:bg-muted',
                  )}
                  onClick={() => setPriority(item)}
                >
                  {priorityLabels[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <PostEditor
              value={content}
              disabled={updatePost.isPending}
              onChange={(nextContent, nextText) => {
                setContent(nextContent);
                setPlainText(nextText);
              }}
            />
          </div>

          {attachments.length > 0 ? (
            <div className="rounded-lg border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
              Existing attachments are kept with the post and are read-only in this edit flow.
            </div>
          ) : null}

          {errors.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors[0]}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={updatePost.isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={updatePost.isPending} onClick={handleSubmit}>
            {updatePost.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
