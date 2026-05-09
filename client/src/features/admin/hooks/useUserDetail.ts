import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints/users.api';
import { queryKeys } from '@/lib/constants';

export function useUserDetail(userId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: userId ? queryKeys.users.detail(userId) : ['users', 'detail', null],
    queryFn: () => usersApi.getById(userId!),
    enabled: enabled && userId !== null,
  });
}
