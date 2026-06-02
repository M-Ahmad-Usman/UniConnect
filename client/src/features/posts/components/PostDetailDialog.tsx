import { format } from 'date-fns';
import { CalendarClock, Pin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { usePost } from '../hooks/usePost';
import { sanitizePostHtml } from '../utils';
import { AttachmentPreview } from './AttachmentPreview';
import { PostActions } from './PostActions';
import { PriorityBadge } from './PriorityBadge';

interface PostDetailDialogProps {
  channelPublicId: string;
  postPublicId: string | null;
  open: boolean;
  canPin: boolean;
  readOnly?: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostDetailDialog({
  channelPublicId,
  postPublicId,
  open,
  canPin,
  readOnly = false,
  onOpenChange,
}: PostDetailDialogProps) {
  const postQuery = usePost(open ? postPublicId : null);
  const post = postQuery.data ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0">
        {postQuery.isLoading ? (
          <div className="space-y-4 p-5">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : postQuery.isError ? (
          <div className="p-5">
            <EmptyState
              icon={CalendarClock}
              title="Post unavailable"
              description="This post could not be loaded right now."
              action={{ label: 'Retry', onClick: () => void postQuery.refetch() }}
            />
          </div>
        ) : post ? (
          <>
            <DialogHeader className="border-b px-5 py-4">
              <div className="flex items-start justify-between gap-4 pr-7">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {post.isPinned ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-200 bg-amber-100 text-amber-900"
                      >
                        <Pin className="size-3.5" />
                        Pinned
                      </Badge>
                    ) : null}
                    <PriorityBadge priority={post.priority} />
                  </div>
                  <DialogTitle className="text-xl leading-7">{post.title}</DialogTitle>
                  <DialogDescription>
                    Posted {format(new Date(post.createdAt), 'PPp')}
                    {post.updatedAt ? ` · Updated ${format(new Date(post.updatedAt), 'PPp')}` : ''}
                  </DialogDescription>
                </div>
                <PostActions
                  channelPublicId={channelPublicId}
                  post={post}
                  canPin={canPin}
                  readOnly={readOnly}
                  onDeleted={() => onOpenChange(false)}
                />
              </div>
            </DialogHeader>

            <div className="space-y-5 px-5 py-5">
              <div className="flex items-center gap-3">
                <UserAvatar
                  fullName={post.author.fullName}
                  profilePictureUrl={post.author.profilePictureUrl}
                />
                <div className="min-w-0">
                  <div className="font-medium">{post.author.fullName}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {post.author.badges.map((badge) => (
                      <RoleBadge key={badge} role={badge} />
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div
                className="space-y-3 text-sm leading-7 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_ol]:list-decimal [&_ul]:list-disc [&_li]:ml-5 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3"
                dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.content) }}
              />

              <AttachmentPreview attachments={post.attachments} />

              {post.pinner ? (
                <div className="rounded-lg border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
                  Pinned by {post.pinner.fullName}
                  {post.pinnedAt ? ` on ${format(new Date(post.pinnedAt), 'PP')}` : ''}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
