import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints/users.api';
import { queryKeys } from '@/lib/constants';

export function useUserDetail(userPublicId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: userPublicId ? queryKeys.users.detail(userPublicId) : ['users', 'detail', null],
    queryFn: () => usersApi.getByPublicId(userPublicId!),
    enabled: enabled && userPublicId !== null,
  });
}
