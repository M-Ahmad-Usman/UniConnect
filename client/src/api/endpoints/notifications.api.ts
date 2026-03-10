import { apiClient } from '@/api/client';
import type { EmptyAuthResponse, Notification, PaginatedResponse, UnreadCountResponse } from '@/types';

interface ListNotificationsParams {
  page?: number;
  limit?: number;
  type?: 'NEW_POST' | 'ROLE_ASSIGNED';
  unreadOnly?: boolean;
}

export const notificationsApi = {
  async list(params?: ListNotificationsParams) {
    const response = await apiClient.get<PaginatedResponse<Notification>>('/notifications', {
      params,
    });
    return response.data;
  },

  async getUnreadCount() {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data;
  },

  async markRead(notificationId: number) {
    const response = await apiClient.patch<EmptyAuthResponse>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllRead() {
    const response = await apiClient.patch<EmptyAuthResponse>('/notifications/read-all');
    return response.data;
  },
};