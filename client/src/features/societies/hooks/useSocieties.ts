import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { societiesApi } from '@/api/endpoints/societies.api';
import { queryKeys } from '@/lib/constants';
import type {
  CreateSocietyRequest,
  SocietyCandidateParams,
  SocietyLeadershipCandidateParams,
  SocietyLifecycleReasonRequest,
  SocietyListParams,
  SocietyRequestListParams,
  UpdateSocietyStatusRequest,
  UpdateSocietyRequest,
} from '@/types';

function cleanParams(params?: object) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== ''),
  );
}

function invalidateSocietyLifecycleQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  societyPublicId: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.societies.all() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyPublicId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.societies.deletionImpact(societyPublicId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.me() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
}

export function useSocieties(params: SocietyListParams) {
  const normalized = cleanParams(params);
  return useQuery({
    queryKey: queryKeys.societies.list(normalized),
    queryFn: () => societiesApi.list(params),
  });
}

export function useSociety(societyPublicId: string | null) {
  return useQuery({
    queryKey: societyPublicId ? queryKeys.societies.detail(societyPublicId) : ['societies', 'idle'],
    queryFn: () => societiesApi.getById(societyPublicId!),
    enabled: societyPublicId !== null,
  });
}

export function useSocietyMembershipStatus(societyPublicId: string | null) {
  return useQuery({
    queryKey: societyPublicId ? queryKeys.societies.myMembership(societyPublicId) : ['societies', 'membership', 'idle'],
    queryFn: () => societiesApi.getMyMembershipStatus(societyPublicId!),
    enabled: societyPublicId !== null,
  });
}

export function useSocietyMembers(
  societyPublicId: string | null,
  params: SocietyListParams,
  enabled = true,
) {
  const normalized = cleanParams(params);
  return useQuery({
    queryKey: societyPublicId ? queryKeys.societies.members(societyPublicId, normalized) : ['societies', 'members', 'idle'],
    queryFn: () => societiesApi.listMembers(societyPublicId!, params),
    enabled: societyPublicId !== null && enabled,
  });
}

export function useSocietyJoinRequests(
  societyPublicId: string | null,
  params: SocietyRequestListParams,
  enabled = true,
) {
  const normalized = cleanParams(params);
  return useQuery({
    queryKey: societyPublicId ? queryKeys.societies.requests(societyPublicId, normalized) : ['societies', 'requests', 'idle'],
    queryFn: () => societiesApi.listJoinRequests(societyPublicId!, params),
    enabled: societyPublicId !== null && enabled,
  });
}

export function useSocietyMemberCandidates(
  societyPublicId: string | null,
  params: SocietyCandidateParams,
  enabled = true,
) {
  const normalized = cleanParams(params);
  return useQuery({
    queryKey: societyPublicId ? queryKeys.societies.candidates(societyPublicId, normalized) : ['societies', 'candidates', 'idle'],
    queryFn: () => societiesApi.listMemberCandidates(societyPublicId!, params),
    enabled: societyPublicId !== null && enabled,
  });
}

export function useSocietyLeadershipCandidates(
  params: SocietyLeadershipCandidateParams | null,
  enabled = true,
) {
  const normalized = cleanParams(params ?? {});
  return useQuery({
    queryKey: params
      ? queryKeys.societies.leadershipCandidates(normalized)
      : ['societies', 'leadership-candidates', 'idle'],
    queryFn: () => societiesApi.listLeadershipCandidates(params!),
    enabled: params !== null && enabled,
  });
}

export function useCreateSociety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSocietyRequest) => societiesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
    },
  });
}

export function useUpdateSociety(societyPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSocietyRequest) => societiesApi.update(societyPublicId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.members(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.candidates(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.leadershipCandidates() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.me() });
    },
  });
}

export function useSubmitSocietyJoinRequest(societyPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => societiesApi.submitJoinRequest(societyPublicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.myMembership(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.requests(societyPublicId) });
    },
  });
}

export function useReviewSocietyJoinRequest(societyPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: number; status: 'APPROVED' | 'REJECTED' }) =>
      societiesApi.reviewJoinRequest(societyPublicId, requestId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.requests(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.members(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyPublicId) });
    },
  });
}

export function useAddSocietyMember(societyPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userPublicId: string) => societiesApi.addMember(societyPublicId, userPublicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.members(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.candidates(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
    },
  });
}

export function useRemoveSocietyMember(societyPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userPublicId: string) => societiesApi.removeMember(societyPublicId, userPublicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.members(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.candidates(societyPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
    },
  });
}

export function useSocietyDeletionImpact(societyPublicId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: societyPublicId
      ? queryKeys.societies.deletionImpact(societyPublicId)
      : ['societies', 'deletion-impact', 'idle'],
    queryFn: () => societiesApi.getDeletionImpact(societyPublicId!),
    enabled: enabled && societyPublicId !== null,
  });
}

export function useUpdateSocietyStatus(societyPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSocietyStatusRequest) =>
      societiesApi.updateStatus(societyPublicId, payload),
    onSuccess: () => invalidateSocietyLifecycleQueries(queryClient, societyPublicId),
  });
}

export function useDeleteSociety(societyPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SocietyLifecycleReasonRequest) =>
      societiesApi.delete(societyPublicId, payload),
    onSuccess: () => invalidateSocietyLifecycleQueries(queryClient, societyPublicId),
  });
}

export function useRestoreSociety(societyPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SocietyLifecycleReasonRequest) =>
      societiesApi.restore(societyPublicId, payload),
    onSuccess: () => invalidateSocietyLifecycleQueries(queryClient, societyPublicId),
  });
}
