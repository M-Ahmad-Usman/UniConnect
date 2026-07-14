import { useQuery } from '@tanstack/react-query';
import { teachingApi } from '@/api/endpoints/teaching.api';
import { queryKeys } from '@/lib/constants';

export function useMyTeaching(historyPage: number) {
  return useQuery({
    queryKey: queryKeys.teaching.mine(historyPage),
    queryFn: () => teachingApi.getMine({ historyPage, historyLimit: 20 }),
  });
}
