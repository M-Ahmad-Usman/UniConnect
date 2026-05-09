import { apiClient } from '@/api/client';
import type {
  BulkImportResult,
  CreateUserRequest,
  CreateUserResponse,
  PaginatedResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UserDetail,
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

  async getById(userId: number) {
    const response = await apiClient.get<UserDetail>(`/users/${userId}`);
    return response.data;
  },

  async deactivate(userId: number) {
    const response = await apiClient.patch<null>(`/users/${userId}/deactivate`);
    return response.data;
  },

  async reactivate(userId: number) {
    const response = await apiClient.patch<null>(`/users/${userId}/reactivate`);
    return response.data;
  },
};
