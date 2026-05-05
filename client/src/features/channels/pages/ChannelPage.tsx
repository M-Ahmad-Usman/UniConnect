import { Hash, Search } from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ChannelHeader } from '@/features/channels/components/ChannelHeader';
import { useServerChannels } from '@/features/channels/hooks/useServerChannels';
import { useServerDetail } from '@/features/servers/hooks/useServerDetail';
import { PostFeed } from '@/features/posts/components/PostFeed';
import { useChannelPostRealtime } from '@/features/posts/hooks/useChannelPostRealtime';
import { parseRouteParamId } from '@/lib/route-params';

export function ChannelPage() {
  const params = useParams();
  const serverId = parseRouteParamId(params.serverId);
  const channelId = parseRouteParamId(params.channelId);
  const serverQuery = useServerDetail(serverId);
  const channelQuery = useServerChannels(serverId, false);

  const activeChannel = useMemo(
    () => channelQuery.data?.find((channel) => channel.id === channelId) ?? null,
    [channelId, channelQuery.data],
  );

  useChannelPostRealtime(activeChannel?.id ?? null);

  if (serverId === null || channelId === null) {
    return (
      <EmptyState
        icon={Hash}
        title="Invalid channel route"
        description="The current server or channel identifier could not be resolved from the URL."
      />
    );
  }

  if (serverQuery.isLoading || channelQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (serverQuery.isError || channelQuery.isError) {
    return (
      <EmptyState
        icon={Search}
        title="Unable to load channel feed"
        description="The server or channel details could not be loaded right now."
        action={{
          label: 'Retry',
          onClick: () => {
            void serverQuery.refetch();
            void channelQuery.refetch();
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

  return (
    <div className="space-y-6">
      {serverId !== null ? <ChannelHeader serverId={serverId} channel={activeChannel} /> : null}
      <PostFeed serverId={serverId} server={serverQuery.data} channel={activeChannel} />
    </div>
  );
}
