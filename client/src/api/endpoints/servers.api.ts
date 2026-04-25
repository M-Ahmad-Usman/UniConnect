import { apiClient } from '@/api/client';
import type {
  ChannelListItem,
  CreateChannelRequest,
  CreateChannelResponse,
  PaginatedResponse,
  ServerDetail,
  ServerListItem,
  ServerMember,
} from '@/types';

interface ListServersParams {
  page?: number;
  limit?: number;
  type?: 'DEPARTMENT' | 'CLASS' | 'SOCIETY';
}

interface ListServerChannelsParams {
  includeArchived?: boolean;
}

interface ListServerMembersParams {
  page?: number;
  limit?: number;
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

  async listMembers(serverId: number, params?: ListServerMembersParams) {
    const response = await apiClient.get<PaginatedResponse<ServerMember>>(
      `/servers/${serverId}/members`,
      {
        params,
      },
    );
    return response.data;
  },

  async createChannel(serverId: number, payload: CreateChannelRequest) {
    const response = await apiClient.post<CreateChannelResponse>(`/servers/${serverId}/channels`, payload);
    return response.data;
  },
};