import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/endpoints/catalog.api';
import { queryKeys } from '@/lib/constants';

export function useDepartmentPrograms(departmentId: number | null) {
  return useQuery({
    queryKey: departmentId
      ? queryKeys.departments.programs(departmentId)
      : ['departments', 'programs', null],
    queryFn: () => catalogApi.listDepartmentPrograms(departmentId!),
    enabled: departmentId !== null,
  });
}
