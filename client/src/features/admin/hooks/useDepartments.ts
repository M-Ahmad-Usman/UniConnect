import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/endpoints/catalog.api';
import { queryKeys } from '@/lib/constants';

export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.departments.list(),
    queryFn: catalogApi.listDepartments,
  });
}
