import { apiClient } from '@/api/client';
import type { AssignRoleRequest, RevokeRoleRequest, UserRole } from '@/types';

export const rolesApi = {
  async getUserRoles(userId: number) {
    const response = await apiClient.get<UserRole[]>(`/roles/users/${userId}`);
    return response.data;
  },

  async assign(payload: AssignRoleRequest) {
    const response = await apiClient.post<UserRole>('/roles/assign', payload);
    return response.data;
  },

  async revoke(payload: RevokeRoleRequest) {
    const response = await apiClient.post<UserRole>('/roles/revoke', payload);
    return response.data;
  },
};
