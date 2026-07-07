import { apiClient } from '@/api/client';
import type {
  AssignableChannelsParams,
  AssignableScopesParams,
  AssignableUsersParams,
  PaginatedResponse,
  PlatformAssignment,
  PlatformAssignmentHistoryParams,
  StaffAssignment,
  TransferAdminRequest,
  RevokeRoleRequest,
  RevokableRoleAssignment,
  RevokableRolesParams,
  RoleChannelOption,
  RoleOption,
  RoleScopeOption,
  RoleUserOption,
  AssignRoleRequest,
  CreateStaffAssignmentRequest,
  UpdatePlatformAssignmentExpiryRequest,
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

  async getUserRoles(userPublicId: string) {
    const response = await apiClient.get<UserRole[]>(`/roles/users/${userPublicId}`);
    return response.data;
  },

  async assign(payload: AssignRoleRequest) {
    if (payload.role === 'hod') {
      const response = await apiClient.put(`/departments/${payload.scopeId}/hod`, {
        userPublicId: payload.userPublicId,
      });
      return response.data;
    }
    if (payload.role === 'program_director') {
      const response = await apiClient.put(`/programs/${payload.scopeId}/program-director`, {
        userPublicId: payload.userPublicId,
      });
      return response.data;
    }
    if (payload.role === 'cr') {
      const response = await apiClient.put(`/classes/${payload.classPublicId}/cr`, {
        userPublicId: payload.userPublicId,
      });
      return response.data;
    }
    if (payload.role === 'enrollment_officer') {
      const response = await apiClient.post<StaffAssignment>('/roles/staff-assignments', payload);
      return response.data;
    }
    const response = await apiClient.post<PlatformAssignment>('/roles/platform-assignments', payload);
    return response.data;
  },

  async assignStaff(payload: CreateStaffAssignmentRequest) {
    const response = await apiClient.post<StaffAssignment>('/roles/staff-assignments', payload);
    return response.data;
  },

  async revokeStaffAssignment(assignmentPublicId: string) {
    const response = await apiClient.delete<StaffAssignment>(
      `/roles/staff-assignments/${assignmentPublicId}`,
    );
    return response.data;
  },

  async transferAdmin(payload: TransferAdminRequest) {
    const response = await apiClient.post<StaffAssignment>('/roles/admin/transfer', payload);
    return response.data;
  },

  async revoke(payload: RevokeRoleRequest) {
    if ('assignmentPublicId' in payload) {
      if (payload.assignmentType === 'staff') {
        return rolesApi.revokeStaffAssignment(payload.assignmentPublicId);
      }
      const response = await apiClient.delete<PlatformAssignment>(
        `/roles/platform-assignments/${payload.assignmentPublicId}`,
      );
      return response.data;
    }
    switch (payload.role) {
      case 'hod': {
        const response = await apiClient.delete(`/departments/${payload.scopeId}/hod`);
        return response.data;
      }
      case 'program_director': {
        const response = await apiClient.delete(`/programs/${payload.scopeId}/program-director`);
        return response.data;
      }
      case 'cr': {
        const response = await apiClient.delete(`/classes/${payload.classPublicId}/cr`);
        return response.data;
      }
    }
  },

  async updatePlatformAssignmentExpiry(payload: UpdatePlatformAssignmentExpiryRequest) {
    const response = await apiClient.patch<PlatformAssignment>(
      `/roles/platform-assignments/${payload.assignmentPublicId}/expiry`,
      { expiresAt: payload.expiresAt },
    );
    return response.data;
  },

  async listPlatformAssignmentHistory(params: PlatformAssignmentHistoryParams) {
    const response = await apiClient.get<PaginatedResponse<PlatformAssignment>>(
      '/roles/platform-assignments/history',
      { params },
    );
    return response.data;
  },
};
