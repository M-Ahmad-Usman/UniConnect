import { apiClient } from '@/api/client';
import type {
  CreateSocietyRequest,
  PaginatedResponse,
  SocietyCandidateParams,
  SocietyDeletionImpact,
  SocietyDetail,
  SocietyLeadershipCandidateParams,
  SocietyLeadershipConflictAction,
  SocietyLeadershipConflictResult,
  SocietyLifecycleReasonRequest,
  SocietyListItem,
  SocietyListParams,
  SocietyMember,
  SocietyMembershipRequest,
  SocietyMembershipStatus,
  SocietyRequestListParams,
  UpdateSocietyStatusRequest,
  UpdateSocietyRequest,
  UserSummary,
} from '@/types';

export const societiesApi = {
  async list(params: SocietyListParams = {}) {
    const response = await apiClient.get<PaginatedResponse<SocietyListItem>>('/societies', {
      params,
    });
    return response.data;
  },

  async getById(societyPublicId: string) {
    const response = await apiClient.get<SocietyDetail>(`/societies/${societyPublicId}`);
    return response.data;
  },

  async create(payload: CreateSocietyRequest) {
    const response = await apiClient.post<SocietyListItem>('/societies', payload);
    return response.data;
  },

  async update(societyPublicId: string, payload: UpdateSocietyRequest) {
    const response = await apiClient.patch<SocietyListItem>(`/societies/${societyPublicId}`, payload);
    return response.data;
  },

  async getMyMembershipStatus(societyPublicId: string) {
    const response = await apiClient.get<SocietyMembershipStatus>(
      `/societies/${societyPublicId}/my-membership`,
    );
    return response.data;
  },

  async submitJoinRequest(societyPublicId: string) {
    const response = await apiClient.post<SocietyMembershipRequest>(
      `/societies/${societyPublicId}/join-request`,
    );
    return response.data;
  },

  async listJoinRequests(societyPublicId: string, params: SocietyRequestListParams = {}) {
    const response = await apiClient.get<PaginatedResponse<SocietyMembershipRequest>>(
      `/societies/${societyPublicId}/join-requests`,
      { params },
    );
    return response.data;
  },

  async reviewJoinRequest(
    societyPublicId: string,
    requestId: number,
    status: 'APPROVED' | 'REJECTED',
  ) {
    const response = await apiClient.patch<SocietyMembershipRequest>(
      `/societies/${societyPublicId}/join-requests/${requestId}`,
      { status },
    );
    return response.data;
  },

  async listMembers(societyPublicId: string, params: SocietyListParams = {}) {
    const response = await apiClient.get<PaginatedResponse<SocietyMember>>(
      `/societies/${societyPublicId}/members`,
      { params },
    );
    return response.data;
  },

  async listMemberCandidates(societyPublicId: string, params: SocietyCandidateParams = {}) {
    const response = await apiClient.get<PaginatedResponse<UserSummary>>(
      `/societies/${societyPublicId}/member-candidates`,
      { params },
    );
    return response.data;
  },

  async listLeadershipCandidates(params: SocietyLeadershipCandidateParams) {
    const response = await apiClient.get<PaginatedResponse<UserSummary>>(
      '/societies/leadership-candidates',
      { params },
    );
    return response.data;
  },

  async addMember(societyPublicId: string, userPublicId: string) {
    const response = await apiClient.post<SocietyMember>(`/societies/${societyPublicId}/members`, {
      userPublicId,
    });
    return response.data;
  },

  async removeMember(societyPublicId: string, userPublicId: string) {
    const response = await apiClient.delete<null>(`/societies/${societyPublicId}/members/${userPublicId}`);
    return response.data;
  },

  async getDeletionImpact(societyPublicId: string) {
    const response = await apiClient.get<SocietyDeletionImpact>(
      `/societies/${societyPublicId}/deletion-impact`,
    );
    return response.data;
  },

  async getLeadershipConflicts(
    societyPublicId: string,
    action: SocietyLeadershipConflictAction,
  ) {
    const response = await apiClient.get<SocietyLeadershipConflictResult>(
      `/societies/${societyPublicId}/leadership-conflicts`,
      { params: { action } },
    );
    return response.data;
  },

  async updateStatus(societyPublicId: string, payload: UpdateSocietyStatusRequest) {
    const response = await apiClient.patch<SocietyListItem>(
      `/societies/${societyPublicId}/status`,
      payload,
    );
    return response.data;
  },

  async delete(societyPublicId: string, payload: SocietyLifecycleReasonRequest) {
    const response = await apiClient.delete<SocietyListItem>(`/societies/${societyPublicId}`, {
      data: payload,
    });
    return response.data;
  },

  async restore(societyPublicId: string, payload: SocietyLifecycleReasonRequest) {
    const response = await apiClient.patch<SocietyListItem>(
      `/societies/${societyPublicId}/restore`,
      payload,
    );
    return response.data;
  },
};
