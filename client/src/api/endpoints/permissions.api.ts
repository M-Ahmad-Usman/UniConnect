import { apiClient } from '@/api/client';
import type { MyPermissions } from '@/types';

export const permissionsApi = {
  async getMe() {
    const response = await apiClient.get<MyPermissions>('/permissions/me');
    return response.data;
  },
};
