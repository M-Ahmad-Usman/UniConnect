import { apiClient } from '@/api/client';
import type { UserProfile } from '@/types';

export const usersApi = {
  async getMe() {
    const response = await apiClient.get<UserProfile>('/users/me');
    return response.data;
  },
};
