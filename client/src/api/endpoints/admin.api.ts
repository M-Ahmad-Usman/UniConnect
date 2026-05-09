import { apiClient } from '@/api/client';
import type { PaginatedResponse, UserListItem, UserListParams } from '@/types';

export const adminApi = {
  async listUsers(params: UserListParams) {
    const response = await apiClient.get<PaginatedResponse<UserListItem>>('/admin/users', {
      params,
    });
    return response.data;
  },
};
