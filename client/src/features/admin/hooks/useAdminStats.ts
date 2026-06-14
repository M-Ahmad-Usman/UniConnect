import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints/admin.api';
import { queryKeys } from '@/lib/constants';

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: adminApi.getStats,
  });
}
