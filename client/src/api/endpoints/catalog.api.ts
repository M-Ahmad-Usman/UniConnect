import { apiClient } from '@/api/client';
import type {
  ClassListItem,
  DepartmentListItem,
  PaginatedResponse,
  ProgramListItem,
} from '@/types';

export interface ListClassesParams {
  page?: number;
  limit?: number;
  programId?: number;
  semester?: number;
}

export const catalogApi = {
  async listDepartments() {
    const response = await apiClient.get<DepartmentListItem[]>('/departments');
    return response.data;
  },

  async listDepartmentPrograms(departmentId: number) {
    const response = await apiClient.get<ProgramListItem[]>(
      `/departments/${departmentId}/programs`,
    );
    return response.data;
  },

  async listClasses(params: ListClassesParams) {
    const response = await apiClient.get<PaginatedResponse<ClassListItem>>('/classes', { params });
    return response.data;
  },
};
