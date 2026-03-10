import { useEffect } from 'react';
import { Hash } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ROUTES } from '@/lib/constants';
import { useServerChannels } from '@/features/channels/hooks/useServerChannels';
import { selectDefaultChannel } from '@/features/channels/utils';
import { parseRouteParamId } from '@/lib/route-params';

export function ServerPage() {
  const navigate = useNavigate();
  const params = useParams();
  const serverId = parseRouteParamId(params.serverId);
  const channelsQuery = useServerChannels(serverId, false);

  useEffect(() => {
    if (serverId === null || !channelsQuery.data) {
      return;
    }

    const nextChannel = selectDefaultChannel(channelsQuery.data);
    if (!nextChannel) {
      return;
    }

    navigate(ROUTES.CHANNEL(serverId, nextChannel.id), { replace: true });
  }, [channelsQuery.data, navigate, serverId]);

  if (channelsQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (channelsQuery.isError) {
    return (
      <EmptyState
        icon={Hash}
        title="Unable to load channels"
        description="The default channel could not be determined right now."
        action={{ label: 'Retry', onClick: () => void channelsQuery.refetch() }}
      />
    );
  }

  if (!channelsQuery.data || channelsQuery.data.length === 0) {
    return (
      <EmptyState
        icon={Hash}
        title="No channels available"
        description="This server does not have any visible channels yet. Channel creation and management will land in a later module."
      />
    );
  }

  return <LoadingSpinner fullPage />;
}