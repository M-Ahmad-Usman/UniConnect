import { useQuery } from '@tanstack/react-query';
import { serversApi } from '@/api/endpoints/servers.api';
import { queryKeys } from '@/lib/constants';

export function useServerChannels(serverId: number | null, includeArchived = false) {
  return useQuery({
    queryKey:
      serverId !== null
        ? queryKeys.servers.channels(serverId, { includeArchived })
        : ['servers', 'channels', 'idle'],
    queryFn: () => serversApi.listChannels(serverId as number, { includeArchived }),
    enabled: serverId !== null,
  });
}