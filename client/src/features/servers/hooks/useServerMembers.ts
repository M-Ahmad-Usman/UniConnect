import { useQuery } from '@tanstack/react-query';
import { serversApi } from '@/api/endpoints/servers.api';
import { queryKeys } from '@/lib/constants';

interface UseServerMembersOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useServerMembers(serverId: number | null, options?: UseServerMembersOptions) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;

  return useQuery({
    queryKey:
      serverId !== null
        ? queryKeys.servers.members(serverId, { page, limit })
        : ['servers', 'members', 'idle'],
    queryFn: () => serversApi.listMembers(serverId as number, { page, limit }),
    enabled: serverId !== null && options?.enabled !== false,
  });
}
