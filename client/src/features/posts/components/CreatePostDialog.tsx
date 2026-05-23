import { useState } from 'react';
import { ImagePlus, Loader2, Megaphone, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { MAX_ATTACHMENTS, MAX_TITLE_LENGTH } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { PostPriority, type PostPriority as PostPriorityType } from '@/types';
import { getApiErrorMessage } from '@/features/auth/utils';
import { createPostSchema } from '../schemas';
import { formatFileSize, priorityLabels, validatePostAttachments } from '../utils';
import { useCreatePost } from '../hooks/useCreatePost';
import { PostEditor } from './PostEditor';

interface CreatePostDialogProps {
  channelId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const priorities = [PostPriority.NORMAL, PostPriority.IMPORTANT, PostPriority.URGENT] as const;

export function CreatePostDialog({
  channelId,
  open,
  onOpenChange,
  onCreated,
}: CreatePostDialogProps) {
  const createPost = useCreatePost(channelId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [plainText, setPlainText] = useState('');
  const [priority, setPriority] = useState<PostPriorityType>(PostPriority.NORMAL);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  function resetForm() {
    setTitle('');
    setContent('');
    setPlainText('');
    setPriority(PostPriority.NORMAL);
    setAttachments([]);
    setErrors([]);
  }

  async function handleSubmit() {
    const parsed = createPostSchema.safeParse({
      title,
      content: plainText.trim() ? content : '',
      priority,
      attachments,
    });

    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    setErrors([]);
    try {
      await createPost.mutateAsync(parsed.data);
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to publish this post right now.'));
    }
  }

  function handleFiles(files: FileList | null) {
    const nextFiles = files
      ? [...attachments, ...Array.from(files)].slice(0, MAX_ATTACHMENTS)
      : attachments;
    setAttachments(nextFiles);
    setErrors(validatePostAttachments(nextFiles));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !createPost.isPending) {
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="!flex max-h-[92dvh] w-[min(94vw,56rem)] !max-w-none flex-col gap-0 overflow-hidden p-0 sm:!max-w-none">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-4" />
            New post
          </DialogTitle>
          <DialogDescription>Publish an update to this channel.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-5 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="post-title">Title</Label>
              <span className="text-xs text-muted-foreground">
                {title.length}/{MAX_TITLE_LENGTH}
              </span>
            </div>
            <Input
              id="post-title"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              disabled={createPost.isPending}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Exam schedule, deadline update, event notice..."
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="grid grid-cols-3 gap-2">
              {priorities.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={createPost.isPending}
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
              disabled={createPost.isPending}
              onChange={(nextContent, nextText) => {
                setContent(nextContent);
                setPlainText(nextText);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-attachments">Attachments</Label>
            <label
              htmlFor="post-attachments"
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <ImagePlus className="mb-2 size-5" />
              Attach up to {MAX_ATTACHMENTS} images
              <span className="mt-1 text-xs">JPEG, PNG, or WEBP. 5MB each.</span>
            </label>
            <input
              id="post-attachments"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={createPost.isPending}
              onChange={(event) => {
                handleFiles(event.target.files);
                event.currentTarget.value = '';
              }}
            />
            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file) => (
                  <Badge
                    key={`${file.name}-${file.size}`}
                    variant="outline"
                    className="max-w-full gap-1.5"
                  >
                    <span className="min-w-0 truncate">{file.name}</span>
                    <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() =>
                        setAttachments((current) => current.filter((item) => item !== file))
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          {errors.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors[0]}
            </div>
          ) : null}
        </div>

        <DialogFooter className="!mx-0 !mb-0 rounded-none border-t px-5 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={createPost.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={createPost.isPending} onClick={handleSubmit}>
            {createPost.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
