import { useQuery } from '@tanstack/react-query';
import { serversApi } from '@/api/endpoints/servers.api';
import { queryKeys } from '@/lib/constants';
import type { ServerListItem } from '@/types';

interface UseServersOptions {
  enabled?: boolean;
}

export function useServers(options?: UseServersOptions) {
  return useQuery({
    queryKey: queryKeys.servers.list(),
    queryFn: () => serversApi.list({ page: 1, limit: 50 }),
    select: (response) => response.data.filter((server) => server.isActive),
    enabled: options?.enabled,
  });
}

export function getServerFromList(servers: ServerListItem[] | undefined, serverId: number) {
  return servers?.find((server) => server.id === serverId) ?? null;
}