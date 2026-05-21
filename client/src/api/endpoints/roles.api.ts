import { apiClient } from '@/api/client';
import type {
  AssignableChannelsParams,
  AssignableScopesParams,
  AssignableUsersParams,
  PaginatedResponse,
  RevokeRoleRequest,
  RevokableRoleAssignment,
  RevokableRolesParams,
  RoleChannelOption,
  RoleOption,
  RoleScopeOption,
  RoleUserOption,
  AssignRoleRequest,
  UserRole,
} from '@/types';

export const rolesApi = {
  async getAssignableRoles() {
    const response = await apiClient.get<RoleOption[]>('/roles/assignable');
    return response.data;
  },

  async listAssignableScopes(params: AssignableScopesParams) {
    const response = await apiClient.get<PaginatedResponse<RoleScopeOption>>(
      '/roles/assignable-scopes',
      { params },
    );
    return response.data;
  },

  async listAssignableChannels(params: AssignableChannelsParams) {
    const response = await apiClient.get<PaginatedResponse<RoleChannelOption>>(
      '/roles/assignable-channels',
      { params },
    );
    return response.data;
  },

  async listAssignableUsers(params: AssignableUsersParams) {
    const response = await apiClient.get<PaginatedResponse<RoleUserOption>>(
      '/roles/assignable-users',
      { params },
    );
    return response.data;
  },

  async listRevokable(params: RevokableRolesParams) {
    const response = await apiClient.get<PaginatedResponse<RevokableRoleAssignment>>(
      '/roles/revokable',
      { params },
    );
    return response.data;
  },

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
