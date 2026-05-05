import { formatDistanceToNow } from 'date-fns';
import { ImageIcon, Pin, Timer } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { cn } from '@/lib/utils';
import type { PostListItem } from '@/types';
import { getInitials, getPlainTextPreview } from '../utils';
import { PostActions } from './PostActions';
import { PriorityBadge } from './PriorityBadge';

interface PostCardProps {
  post: PostListItem;
  channelId: number;
  canPin: boolean;
  onOpen: (postId: number) => void;
}

export function PostCard({ post, channelId, canPin, onOpen }: PostCardProps) {
  const edited = post.updatedAt !== null && post.updatedAt !== post.createdAt;
  const preview = getPlainTextPreview(post.content);

  return (
    <article
      className={cn(
        'group rounded-lg border bg-background shadow-sm transition-all hover:border-foreground/25 hover:shadow-md',
        post.isPinned && 'border-amber-300 bg-amber-50/55 dark:border-amber-800 dark:bg-amber-950/25',
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <Avatar className="mt-0.5">
          <AvatarImage src={post.author.profilePictureUrl ?? undefined} alt={post.author.fullName} />
          <AvatarFallback>{getInitials(post.author.fullName)}</AvatarFallback>
        </Avatar>

        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(post.id)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{post.author.fullName}</span>
            {post.author.badges.map((badge) => (
              <RoleBadge key={badge} role={badge} />
            ))}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {post.isPinned ? (
              <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-100 text-amber-900">
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
            {post._count.attachments > 0 ? (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <ImageIcon className="size-3.5" />
                {post._count.attachments}
              </Badge>
            ) : null}
          </div>

          <h2 className="mt-3 line-clamp-2 text-base font-semibold tracking-tight">{post.title}</h2>
          {preview ? (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{preview}</p>
          ) : null}
        </button>

        <div className="-mr-1 -mt-1 shrink-0">
          <PostActions channelId={channelId} post={post} canPin={canPin} />
        </div>
      </div>
    </article>
  );
}
