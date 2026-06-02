import { formatDistanceToNow } from 'date-fns';
import { Pin, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import type { PostListItem } from '@/types';
import { getPlainTextPreview } from '../utils';
import { PostActions } from './PostActions';
import { AttachmentPreview } from './AttachmentPreview';
import { PriorityBadge } from './PriorityBadge';

interface PostCardProps {
  post: PostListItem;
  channelPublicId: string;
  canPin: boolean;
  readOnly?: boolean;
  onOpen: (postPublicId: string) => void;
}

export function PostCard({ post, channelPublicId, canPin, readOnly = false, onOpen }: PostCardProps) {
  const edited = post.updatedAt !== null && post.updatedAt !== post.createdAt;
  const preview = getPlainTextPreview(post.content);

  return (
    <article
      className={cn(
        'group rounded-lg border bg-card shadow-sm transition-colors hover:border-foreground/25 hover:bg-accent/45',
        post.isPinned &&
          'border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/20',
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <UserAvatar
          fullName={post.author.fullName}
          profilePictureUrl={post.author.profilePictureUrl}
          className="mt-0.5"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{post.author.fullName}</span>
            {post.author.badges.map((badge) => (
              <RoleBadge key={badge} role={badge} />
            ))}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
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
            {edited ? (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Timer className="size-3.5" />
                Edited
              </Badge>
            ) : null}
          </div>

          <button
            type="button"
            className="mt-2 block min-w-0 text-left"
            onClick={() => onOpen(post.publicId)}
          >
            <h2 className="line-clamp-2 text-base font-semibold tracking-tight">{post.title}</h2>
            {preview ? (
              <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">{preview}</p>
            ) : null}
          </button>

          {post.attachments.length > 0 ? (
            <div className="mt-3">
              <AttachmentPreview attachments={post.attachments} compact />
            </div>
          ) : null}
        </div>

        <div className="-mr-1 -mt-1 shrink-0">
          <PostActions
            channelPublicId={channelPublicId}
            post={post}
            canPin={canPin}
            readOnly={readOnly}
          />
        </div>
      </div>
    </article>
  );
}
