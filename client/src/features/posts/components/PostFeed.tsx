import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Inbox, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  PostPriority,
  type ChannelListItem,
  type PostListParams,
  type ServerDetail,
} from '@/types';
import { useChannelPosts } from '../hooks/useChannelPosts';
import { useCanManagePostPin, useCanPostInChannel } from '../hooks/usePostPermissions';
import { normalizeDateParam, parseSearchParam } from '../utils';
import { CreatePostDialog } from './CreatePostDialog';
import { PostCard } from './PostCard';
import { PostDetailDialog } from './PostDetailDialog';
import { PostFilters } from './PostFilters';

interface PostFeedProps {
  serverPublicId: string;
  server: ServerDetail | null | undefined;
  channel: ChannelListItem;
}

export function PostFeed({ serverPublicId, server, channel }: PostFeedProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPostPublicId, setSelectedPostPublicId] = useState<string | null>(null);
  const feedTopRef = useRef<HTMLDivElement | null>(null);
  const latestSearchParamsRef = useRef(searchParams);
  const search = parseSearchParam(searchParams.get('search'));
  const priorityParam = searchParams.get('priority');
  const priority = Object.values(PostPriority).includes(priorityParam as PostPriority)
    ? (priorityParam as PostPriority)
    : undefined;
  const startDate = normalizeDateParam(searchParams.get('startDate'));
  const endDate = normalizeDateParam(searchParams.get('endDate'));
  const canPost = useCanPostInChannel(server, channel);
  const canManagePin = useCanManagePostPin(serverPublicId);
  const canPin = !channel.isArchived && canManagePin;

  const params: PostListParams = {
    limit: 20,
    ...(search ? { search } : {}),
    ...(priority ? { priority } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const postsQuery = useChannelPosts(channel.publicId, params);

  useEffect(() => {
    latestSearchParamsRef.current = searchParams;
  }, [searchParams]);

  const posts = useMemo(() => {
    const seen = new Set<string>();
    return (postsQuery.data?.pages ?? []).flatMap((page) =>
      page.data.filter((post) => {
        if (seen.has(post.publicId)) {
          return false;
        }
        seen.add(post.publicId);
        return true;
      }),
    );
  }, [postsQuery.data?.pages]);
  const total = postsQuery.data?.pages[0]?.pagination.total ?? 0;
  const hasFilters = Boolean(search || priority || startDate || endDate);

  function updateSearchParam(key: string, value?: string) {
    startTransition(() => {
      const nextSearchParams = new URLSearchParams(latestSearchParamsRef.current);
      if (value) {
        nextSearchParams.set(key, value);
      } else {
        nextSearchParams.delete(key);
      }
      latestSearchParamsRef.current = nextSearchParams;
      setSearchParams(nextSearchParams, { replace: true });
    });
  }

  function clearFilters() {
    startTransition(() => {
      const nextSearchParams = new URLSearchParams(latestSearchParamsRef.current);
      nextSearchParams.delete('priority');
      nextSearchParams.delete('startDate');
      nextSearchParams.delete('endDate');
      latestSearchParamsRef.current = nextSearchParams;
      setSearchParams(nextSearchParams, { replace: true });
    });
  }

  return (
    <section ref={feedTopRef} className="space-y-4 pb-20">
      <PostFilters
        priority={priority}
        startDate={startDate}
        endDate={endDate}
        resultCount={posts.length}
        totalCount={total}
        onPriorityChange={(value) => updateSearchParam('priority', value)}
        onStartDateChange={(value) => updateSearchParam('startDate', value)}
        onEndDateChange={(value) => updateSearchParam('endDate', value)}
        onClear={clearFilters}
      />

      {postsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : postsQuery.isError ? (
        <EmptyState
          icon={RefreshCw}
          title="Unable to load posts"
          description="The channel feed could not be loaded right now."
          action={{ label: 'Retry', onClick: () => void postsQuery.refetch() }}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={hasFilters ? Search : Inbox}
          title={hasFilters ? 'No matching posts' : 'No posts yet'}
          description={
            hasFilters
              ? 'Try a different title keyword, priority, or date window.'
              : canPost
                ? 'Publish the first update when you are ready.'
                : 'Posts will appear here once announcements are published.'
          }
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.publicId}
              post={post}
              channelPublicId={channel.publicId}
              canPin={canPin}
              readOnly={channel.isArchived}
              onOpen={setSelectedPostPublicId}
            />
          ))}
        </div>
      )}

      {postsQuery.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={postsQuery.isFetchingNextPage}
            onClick={() => void postsQuery.fetchNextPage()}
          >
            {postsQuery.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      ) : null}

      {canPost ? (
        <Button
          type="button"
          aria-label="Create new post"
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 h-12 rounded-full px-4 shadow-lg lg:right-6"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-5" />
          <span className="hidden sm:inline">New post</span>
        </Button>
      ) : null}

      <CreatePostDialog
        channelPublicId={channel.publicId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => feedTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
      />

      <PostDetailDialog
        channelPublicId={channel.publicId}
        postPublicId={selectedPostPublicId}
        open={selectedPostPublicId !== null}
        canPin={canPin}
        readOnly={channel.isArchived}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPostPublicId(null);
          }
        }}
      />
    </section>
  );
}
