import { apiClient } from '@/api/client';
import type { AdminStats, PaginatedResponse, UserListItem, UserListParams } from '@/types';

export const adminApi = {
  async getStats() {
    const response = await apiClient.get<AdminStats>('/admin/stats');
    return response.data;
  },

  async listUsers(params: UserListParams) {
    const response = await apiClient.get<PaginatedResponse<UserListItem>>('/admin/users', {
      params,
    });
    return response.data;
  },
};
