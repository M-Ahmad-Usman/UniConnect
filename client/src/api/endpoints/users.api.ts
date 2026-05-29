import { apiClient } from '@/api/client';
import type {
  BulkImportResult,
  CreateUserRequest,
  CreateUserResponse,
  PaginatedResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UpdateUserStatusRequest,
  UserDetail,
  UserDeletionImpact,
  UserLifecycleReasonRequest,
  UserListItem,
  UserListParams,
  UserProfile,
} from '@/types';

export const usersApi = {
  async getMe() {
    const response = await apiClient.get<UserProfile>('/users/me');
    return response.data;
  },

  async updateProfile(payload: UpdateProfileRequest) {
    const response = await apiClient.patch<UpdateProfileResponse>('/users/me', payload);
    return response.data;
  },

  async updateProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await apiClient.patch<{ profilePictureUrl: string }>(
      '/users/me/profile-picture',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  async create(payload: CreateUserRequest) {
    const response = await apiClient.post<CreateUserResponse>('/users', payload);
    return response.data;
  },

  async bulkImport(file: File, onUploadProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<BulkImportResult>('/users/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) {
          return;
        }
        onUploadProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data;
  },

  async list(params: UserListParams) {
    const response = await apiClient.get<PaginatedResponse<UserListItem>>('/users', { params });
    return response.data;
  },

  async getByPublicId(userPublicId: string) {
    const response = await apiClient.get<UserDetail>(`/users/${userPublicId}`);
    return response.data;
  },

  async getDeletionImpact(userPublicId: string) {
    const response = await apiClient.get<UserDeletionImpact>(
      `/users/${userPublicId}/deletion-impact`,
    );
    return response.data;
  },

  async updateStatus(userPublicId: string, payload: UpdateUserStatusRequest) {
    const response = await apiClient.patch<UserDetail>(`/users/${userPublicId}/status`, payload);
    return response.data;
  },

  async delete(userPublicId: string, payload: UserLifecycleReasonRequest) {
    const response = await apiClient.delete<UserDetail>(`/users/${userPublicId}`, { data: payload });
    return response.data;
  },

  async restore(userPublicId: string, payload: UserLifecycleReasonRequest) {
    const response = await apiClient.patch<UserDetail>(`/users/${userPublicId}/restore`, payload);
    return response.data;
  },
};
