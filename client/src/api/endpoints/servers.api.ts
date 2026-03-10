import { apiClient } from '@/api/client';
import type { ChannelListItem, PaginatedResponse, ServerDetail, ServerListItem } from '@/types';

interface ListServersParams {
  page?: number;
  limit?: number;
  type?: 'DEPARTMENT' | 'CLASS' | 'SOCIETY';
}

interface ListServerChannelsParams {
  includeArchived?: boolean;
}

export const serversApi = {
  async list(params?: ListServersParams) {
    const response = await apiClient.get<PaginatedResponse<ServerListItem>>('/servers', { params });
    return response.data;
  },

  async getById(serverId: number) {
    const response = await apiClient.get<ServerDetail>(`/servers/${serverId}`);
    return response.data;
  },

  async listChannels(serverId: number, params?: ListServerChannelsParams) {
    const response = await apiClient.get<ChannelListItem[]>(`/servers/${serverId}/channels`, {
      params,
    });
    return response.data;
  },
};