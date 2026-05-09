import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/endpoints/catalog.api';
import { queryKeys } from '@/lib/constants';
import { userListParamsToRecord } from '../utils';

export function useClasses(programId: number | null) {
  const params = {
    page: 1,
    limit: 50,
    programId: programId ?? undefined,
  };

  return useQuery({
    queryKey: queryKeys.classes.list(userListParamsToRecord(params)),
    queryFn: () => catalogApi.listClasses(params),
    enabled: programId !== null,
    select: (response) => response.data,
  });
}
