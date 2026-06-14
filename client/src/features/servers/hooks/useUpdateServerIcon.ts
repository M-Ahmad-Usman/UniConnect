import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serversApi } from '@/api/endpoints/servers.api';
import { queryKeys } from '@/lib/constants';
import type { PaginatedResponse, ServerDetail, ServerListItem } from '@/types';

export function useUpdateServerIcon(serverPublicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => serversApi.updateIcon(serverPublicId, file),
    onSuccess: (updated) => {
      queryClient.setQueryData<ServerDetail>(queryKeys.servers.detail(serverPublicId), (current) =>
        current ? { ...current, iconUrl: updated.iconUrl } : current,
      );

      queryClient.setQueryData<PaginatedResponse<ServerListItem>>(
        queryKeys.servers.list(),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            data: current.data.map((server) =>
              server.publicId === serverPublicId ? { ...server, iconUrl: updated.iconUrl } : server,
            ),
          };
        },
      );

      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.detail(serverPublicId) });
    },
  });
}
