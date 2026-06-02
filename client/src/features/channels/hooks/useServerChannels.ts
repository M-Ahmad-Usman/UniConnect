import { useQuery } from '@tanstack/react-query';
import { serversApi } from '@/api/endpoints/servers.api';
import { queryKeys } from '@/lib/constants';

export function useServerChannels(serverPublicId: string | null, includeArchived = false) {
  return useQuery({
    queryKey:
      serverPublicId !== null
        ? queryKeys.servers.channels(serverPublicId, { includeArchived })
        : ['servers', 'channels', 'idle'],
    queryFn: () => serversApi.listChannels(serverPublicId as string, { includeArchived }),
    enabled: serverPublicId !== null,
  });
}
