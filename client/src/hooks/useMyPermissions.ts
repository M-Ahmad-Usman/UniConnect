import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '@/api/endpoints/permissions.api';
import { queryKeys } from '@/lib/constants';

export function useMyPermissions() {
  return useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: permissionsApi.getMe,
  });
}
