import { apiClient } from '@/api/client';
import type {
  EmptyAuthResponse,
  Notification,
  NotificationListParams,
  NotificationPreference,
  NotificationPreferenceListParams,
  PaginatedResponse,
  UnreadCountResponse,
  UpdatePreferenceRequest,
} from '@/types';

export const notificationsApi = {
  async list(params?: NotificationListParams) {
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

  async listPreferences(params?: NotificationPreferenceListParams) {
    const response = await apiClient.get<NotificationPreference[]>('/notification-preferences', {
      params,
    });
    return response.data;
  },

  async updatePreference(payload: UpdatePreferenceRequest) {
    const response = await apiClient.patch<NotificationPreference>(
      '/notification-preferences',
      payload,
    );
    return response.data;
  },
};
