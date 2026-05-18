import { apiClient } from '@/api/client';
import type {
  CreateSocietyRequest,
  PaginatedResponse,
  SocietyCandidateParams,
  SocietyDetail,
  SocietyListItem,
  SocietyListParams,
  SocietyMember,
  SocietyMembershipRequest,
  SocietyMembershipStatus,
  SocietyRequestListParams,
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

  async getById(societyId: number) {
    const response = await apiClient.get<SocietyDetail>(`/societies/${societyId}`);
    return response.data;
  },

  async create(payload: CreateSocietyRequest) {
    const response = await apiClient.post<SocietyListItem>('/societies', payload);
    return response.data;
  },

  async update(societyId: number, payload: UpdateSocietyRequest) {
    const response = await apiClient.patch<SocietyListItem>(`/societies/${societyId}`, payload);
    return response.data;
  },

  async getMyMembershipStatus(societyId: number) {
    const response = await apiClient.get<SocietyMembershipStatus>(
      `/societies/${societyId}/my-membership`,
    );
    return response.data;
  },

  async submitJoinRequest(societyId: number) {
    const response = await apiClient.post<SocietyMembershipRequest>(
      `/societies/${societyId}/join-request`,
    );
    return response.data;
  },

  async listJoinRequests(societyId: number, params: SocietyRequestListParams = {}) {
    const response = await apiClient.get<PaginatedResponse<SocietyMembershipRequest>>(
      `/societies/${societyId}/join-requests`,
      { params },
    );
    return response.data;
  },

  async reviewJoinRequest(
    societyId: number,
    requestId: number,
    status: 'APPROVED' | 'REJECTED',
  ) {
    const response = await apiClient.patch<SocietyMembershipRequest>(
      `/societies/${societyId}/join-requests/${requestId}`,
      { status },
    );
    return response.data;
  },

  async listMembers(societyId: number, params: SocietyListParams = {}) {
    const response = await apiClient.get<PaginatedResponse<SocietyMember>>(
      `/societies/${societyId}/members`,
      { params },
    );
    return response.data;
  },

  async listMemberCandidates(societyId: number, params: SocietyCandidateParams = {}) {
    const response = await apiClient.get<PaginatedResponse<UserSummary>>(
      `/societies/${societyId}/member-candidates`,
      { params },
    );
    return response.data;
  },

  async addMember(societyId: number, userId: number) {
    const response = await apiClient.post<SocietyMember>(`/societies/${societyId}/members`, {
      userId,
    });
    return response.data;
  },

  async removeMember(societyId: number, userId: number) {
    const response = await apiClient.delete<null>(`/societies/${societyId}/members/${userId}`);
    return response.data;
  },
};
