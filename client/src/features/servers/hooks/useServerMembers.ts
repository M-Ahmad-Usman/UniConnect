import { useQuery } from '@tanstack/react-query';
import { serversApi } from '@/api/endpoints/servers.api';
import { queryKeys } from '@/lib/constants';

interface UseServerMembersOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useServerMembers(serverPublicId: string | null, options?: UseServerMembersOptions) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;

  return useQuery({
    queryKey:
      serverPublicId !== null
        ? queryKeys.servers.members(serverPublicId, { page, limit })
        : ['servers', 'members', 'idle'],
    queryFn: () => serversApi.listMembers(serverPublicId as string, { page, limit }),
    enabled: serverPublicId !== null && options?.enabled !== false,
  });
}
