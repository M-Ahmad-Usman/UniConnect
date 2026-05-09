import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints/admin.api';
import { queryKeys } from '@/lib/constants';
import type { UserListParams } from '@/types';
import { userListParamsToRecord } from '../utils';

export function useAdminUsers(params: UserListParams) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: queryKeys.admin.users(normalized),
    queryFn: () => adminApi.listUsers(params),
  });
}
