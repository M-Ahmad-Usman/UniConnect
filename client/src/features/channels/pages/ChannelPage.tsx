import { Hash, Search } from 'lucide-react';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ChannelHeader } from '@/features/channels/components/ChannelHeader';
import { useServerChannels } from '@/features/channels/hooks/useServerChannels';
import { useChannelPosts } from '@/features/posts/hooks/useChannelPosts';
import { parseSearchParam } from '@/features/posts/utils';
import { parseRouteParamId } from '@/lib/route-params';

export function ChannelPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const serverId = parseRouteParamId(params.serverId);
  const channelId = parseRouteParamId(params.channelId);
  const search = parseSearchParam(searchParams.get('search'));
  const channelQuery = useServerChannels(serverId, false);
  const postsQuery = useChannelPosts(serverId !== null ? channelId : null, {
    page: 1,
    limit: 20,
    ...(search ? { search } : {}),
  });

  const activeChannel = useMemo(
    () => channelQuery.data?.find((channel) => channel.id === channelId) ?? null,
    [channelId, channelQuery.data],
  );

  if (serverId === null || channelId === null) {
    return (
      <EmptyState
        icon={Hash}
        title="Invalid channel route"
        description="The current server or channel identifier could not be resolved from the URL."
      />
    );
  }

  if (channelQuery.isLoading || postsQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (channelQuery.isError || postsQuery.isError) {
    return (
      <EmptyState
        icon={Search}
        title="Unable to load channel feed"
        description="The channel details or post preview could not be loaded right now."
        action={{
          label: 'Retry',
          onClick: () => {
            void channelQuery.refetch();
            void postsQuery.refetch();
          },
        }}
      />
    );
  }

  if (!activeChannel) {
    return (
      <EmptyState
        icon={Hash}
        title="Channel not found"
        description="The selected channel is unavailable or you no longer have access to it."
      />
    );
  }

  const posts = postsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      {serverId !== null ? <ChannelHeader serverId={serverId} channel={activeChannel} /> : null}
      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4" />
            Channel feed preview
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Module 3 hardens channel discovery with scoped search, resilient loading states, and management-aware header actions.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>
              {search ? `Showing results for “${search}”` : 'Showing the latest posts in this channel'}
            </span>
            <span>{postsQuery.data?.pagination.total ?? posts.length} total</span>
          </div>
          <Separator />
          {posts.length === 0 ? (
            <EmptyState
              icon={Search}
              title={search ? 'No matching posts' : 'No posts yet'}
              description={
                search
                  ? 'Try a different title keyword or clear the search input.'
                  : 'Posts will appear here once announcements are published in this channel.'
              }
            />
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <article key={post.id} className="rounded-xl border border-border bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-medium">{post.title}</h2>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {post.author.fullName} · {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">{post.priority}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-3 line-clamp-3 text-sm">{post.content}</p>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
