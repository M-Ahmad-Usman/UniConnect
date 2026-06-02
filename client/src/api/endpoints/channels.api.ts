import { apiClient } from '@/api/client';
import type {
  LockChannelResponse,
  UnlockChannelResponse,
  UpdateChannelRequest,
  UpdateChannelResponse,
} from '@/types';

export const channelsApi = {
  async updateChannel(channelPublicId: string, payload: UpdateChannelRequest) {
    const response = await apiClient.patch<UpdateChannelResponse>(`/channels/${channelPublicId}`, payload);
    return response.data;
  },

  async lockChannel(channelPublicId: string) {
    const response = await apiClient.patch<LockChannelResponse>(`/channels/${channelPublicId}/lock`);
    return response.data;
  },

  async unlockChannel(channelPublicId: string) {
    const response = await apiClient.patch<UnlockChannelResponse>(`/channels/${channelPublicId}/unlock`);
    return response.data;
  },

  async deleteChannel(channelPublicId: string) {
    const response = await apiClient.delete<null>(`/channels/${channelPublicId}`);
    return response.data;
  },
};
