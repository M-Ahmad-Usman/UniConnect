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
  async listByChannel(channelId: number, params?: PostListParams) {
    const response = await apiClient.get<PaginatedResponse<PostListItem>>(
      `/channels/${channelId}/posts`,
      { params },
    );
    return response.data;
  },

  async get(postId: number) {
    const response = await apiClient.get<PostDetail>(`/posts/${postId}`);
    return response.data;
  },

  async create(channelId: number, payload: CreatePostRequest) {
    const response = await apiClient.post<PostDetail>(
      `/channels/${channelId}/posts`,
      buildPostFormData(payload),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  async update(postId: number, payload: UpdatePostRequest) {
    const response = await apiClient.patch<PostDetail>(`/posts/${postId}`, payload);
    return response.data;
  },

  async delete(postId: number) {
    await apiClient.delete<null>(`/posts/${postId}`);
  },

  async pin(postId: number, isPinned: boolean) {
    const response = await apiClient.patch<PostDetail>(`/posts/${postId}/pin`, { isPinned });
    return response.data;
  },
};
