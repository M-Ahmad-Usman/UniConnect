import { apiClient } from '@/api/client';
import type {
  CreatePostRequest,
  PaginatedResponse,
  PostDetail,
  PostListItem,
  PostListParams,
  UpdatePostRequest,
} from '@/types';

function buildPostFormData(payload: CreatePostRequest) {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('content', payload.content);
  formData.append('priority', payload.priority ?? 'NORMAL');

  payload.attachments?.forEach((file) => {
    formData.append('attachments', file);
  });

  return formData;
}

export const postsApi = {
  async listByChannel(channelPublicId: string, params?: PostListParams) {
    const response = await apiClient.get<PaginatedResponse<PostListItem>>(
      `/channels/${channelPublicId}/posts`,
      { params },
    );
    return response.data;
  },

  async get(postPublicId: string) {
    const response = await apiClient.get<PostDetail>(`/posts/${postPublicId}`);
    return response.data;
  },

  async create(channelPublicId: string, payload: CreatePostRequest) {
    const response = await apiClient.post<PostDetail>(
      `/channels/${channelPublicId}/posts`,
      buildPostFormData(payload),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  async update(postPublicId: string, payload: UpdatePostRequest) {
    const response = await apiClient.patch<PostDetail>(`/posts/${postPublicId}`, payload);
    return response.data;
  },

  async delete(postPublicId: string) {
    await apiClient.delete<null>(`/posts/${postPublicId}`);
  },

  async pin(postPublicId: string, isPinned: boolean) {
    const response = await apiClient.patch<PostDetail>(`/posts/${postPublicId}/pin`, { isPinned });
    return response.data;
  },
};
