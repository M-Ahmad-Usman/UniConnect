import { useEffect } from 'react';
import { Hash } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ROUTES } from '@/lib/constants';
import { useServerChannels } from '@/features/channels/hooks/useServerChannels';
import { selectDefaultChannel } from '@/features/channels/utils';
import { parseRouteParamPublicId } from '@/lib/route-params';

export function ServerPage() {
  const navigate = useNavigate();
  const params = useParams();
  const serverPublicId = parseRouteParamPublicId(params.serverPublicId);
  const channelsQuery = useServerChannels(serverPublicId, false);

  useEffect(() => {
    if (serverPublicId === null || !channelsQuery.data) {
      return;
    }

    const nextChannel = selectDefaultChannel(channelsQuery.data);
    if (!nextChannel) {
      return;
    }

    navigate(ROUTES.CHANNEL(serverPublicId, nextChannel.publicId), { replace: true });
  }, [channelsQuery.data, navigate, serverPublicId]);

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
        description="This server does not have any visible channels yet. Create a channel when the server is ready for members."
      />
    );
  }

  return <LoadingSpinner fullPage />;
}
