import { useQuery } from '@tanstack/react-query';
import { serversApi } from '@/api/endpoints/servers.api';
import { queryKeys } from '@/lib/constants';

export function useServerDetail(serverPublicId: string | null) {
  return useQuery({
    queryKey: serverPublicId
      ? queryKeys.servers.detail(serverPublicId)
      : ['servers', 'detail', 'idle'],
    queryFn: () => serversApi.getById(serverPublicId as string),
    enabled: serverPublicId !== null,
  });
}
