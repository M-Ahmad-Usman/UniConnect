import { apiClient } from '@/api/client';
import type { PaginatedResponse, PostListItem, PostListParams } from '@/types';

export const postsApi = {
  async listByChannel(channelId: number, params?: PostListParams) {
    const response = await apiClient.get<PaginatedResponse<PostListItem>>(
      `/channels/${channelId}/posts`,
      { params },
    );
    return response.data;
  },
};