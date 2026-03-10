import { useQuery } from '@tanstack/react-query';
import { serversApi } from '@/api/endpoints/servers.api';
import { queryKeys } from '@/lib/constants';

export function useServerDetail(serverId: number | null) {
  return useQuery({
    queryKey: serverId ? queryKeys.servers.detail(serverId) : ['servers', 'detail', 'idle'],
    queryFn: () => serversApi.getById(serverId as number),
    enabled: serverId !== null,
  });
}