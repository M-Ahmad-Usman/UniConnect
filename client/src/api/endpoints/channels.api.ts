import { apiClient } from '@/api/client';
import type {
  LockChannelResponse,
  UnlockChannelResponse,
  UpdateChannelRequest,
  UpdateChannelResponse,
} from '@/types';

export const channelsApi = {
  async updateChannel(channelId: number, payload: UpdateChannelRequest) {
    const response = await apiClient.patch<UpdateChannelResponse>(`/channels/${channelId}`, payload);
    return response.data;
  },

  async lockChannel(channelId: number) {
    const response = await apiClient.patch<LockChannelResponse>(`/channels/${channelId}/lock`);
    return response.data;
  },

  async unlockChannel(channelId: number) {
    const response = await apiClient.patch<UnlockChannelResponse>(`/channels/${channelId}/unlock`);
    return response.data;
  },

  async deleteChannel(channelId: number) {
    const response = await apiClient.delete<null>(`/channels/${channelId}`);
    return response.data;
  },
};
