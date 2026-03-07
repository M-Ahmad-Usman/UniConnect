import { apiClient } from '@/api/client';
import type {
  ChangePasswordRequest,
  EmptyAuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
} from '@/types';

export const authApi = {
  async login(credentials: LoginRequest) {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  async logout() {
    const response = await apiClient.post<EmptyAuthResponse>('/auth/logout');
    return response.data;
  },

  async refresh() {
    const response = await apiClient.post<EmptyAuthResponse>('/auth/refresh');
    return response.data;
  },

  async forgotPassword(payload: ForgotPasswordRequest) {
    const response = await apiClient.post<EmptyAuthResponse>('/auth/forgot-password', payload);
    return response.data;
  },

  async resetPassword(payload: ResetPasswordRequest) {
    const response = await apiClient.post<EmptyAuthResponse>('/auth/reset-password', payload);
    return response.data;
  },

  async changePassword(payload: ChangePasswordRequest) {
    const response = await apiClient.patch<EmptyAuthResponse>('/auth/change-password', payload);
    return response.data;
  },
};
