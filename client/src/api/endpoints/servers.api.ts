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

  async getById(serverPublicId: string) {
    const response = await apiClient.get<ServerDetail>(`/servers/${serverPublicId}`);
    return response.data;
  },

  async listChannels(serverPublicId: string, params?: ListServerChannelsParams) {
    const response = await apiClient.get<ChannelListItem[]>(`/servers/${serverPublicId}/channels`, {
      params,
    });
    return response.data;
  },

  async listMembers(serverPublicId: string, params?: ListServerMembersParams) {
    const response = await apiClient.get<PaginatedResponse<ServerMember>>(
      `/servers/${serverPublicId}/members`,
      {
        params,
      },
    );
    return response.data;
  },

  async createChannel(serverPublicId: string, payload: CreateChannelRequest) {
    const response = await apiClient.post<CreateChannelResponse>(
      `/servers/${serverPublicId}/channels`,
      payload,
    );
    return response.data;
  },

  async updateIcon(serverPublicId: string, file: File) {
    const formData = new FormData();
    formData.append('serverIcon', file);

    const response = await apiClient.patch<{ publicId: string; iconUrl: string }>(
      `/servers/${serverPublicId}/icon`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },
};
