import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { societiesApi } from '@/api/endpoints/societies.api';
import { queryKeys } from '@/lib/constants';
import type {
  CreateSocietyRequest,
  SocietyCandidateParams,
  SocietyLeadershipCandidateParams,
  SocietyListParams,
  SocietyRequestListParams,
  UpdateSocietyRequest,
} from '@/types';

function cleanParams(params?: object) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export function useSocieties(params: SocietyListParams) {
  const normalized = cleanParams(params);
  return useQuery({
    queryKey: queryKeys.societies.list(normalized),
    queryFn: () => societiesApi.list(params),
  });
}

export function useSociety(societyId: number | null) {
  return useQuery({
    queryKey: societyId ? queryKeys.societies.detail(societyId) : ['societies', 'idle'],
    queryFn: () => societiesApi.getById(societyId!),
    enabled: societyId !== null,
  });
}

export function useSocietyMembershipStatus(societyId: number | null) {
  return useQuery({
    queryKey: societyId ? queryKeys.societies.myMembership(societyId) : ['societies', 'membership', 'idle'],
    queryFn: () => societiesApi.getMyMembershipStatus(societyId!),
    enabled: societyId !== null,
  });
}

export function useSocietyMembers(
  societyId: number | null,
  params: SocietyListParams,
  enabled = true,
) {
  const normalized = cleanParams(params);
  return useQuery({
    queryKey: societyId ? queryKeys.societies.members(societyId, normalized) : ['societies', 'members', 'idle'],
    queryFn: () => societiesApi.listMembers(societyId!, params),
    enabled: societyId !== null && enabled,
  });
}

export function useSocietyJoinRequests(
  societyId: number | null,
  params: SocietyRequestListParams,
  enabled = true,
) {
  const normalized = cleanParams(params);
  return useQuery({
    queryKey: societyId ? queryKeys.societies.requests(societyId, normalized) : ['societies', 'requests', 'idle'],
    queryFn: () => societiesApi.listJoinRequests(societyId!, params),
    enabled: societyId !== null && enabled,
  });
}

export function useSocietyMemberCandidates(
  societyId: number | null,
  params: SocietyCandidateParams,
  enabled = true,
) {
  const normalized = cleanParams(params);
  return useQuery({
    queryKey: societyId ? queryKeys.societies.candidates(societyId, normalized) : ['societies', 'candidates', 'idle'],
    queryFn: () => societiesApi.listMemberCandidates(societyId!, params),
    enabled: societyId !== null && enabled,
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

export function useUpdateSociety(societyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSocietyRequest) => societiesApi.update(societyId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.members(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.candidates(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.leadershipCandidates() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.me() });
    },
  });
}

export function useSubmitSocietyJoinRequest(societyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => societiesApi.submitJoinRequest(societyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.myMembership(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.requests(societyId) });
    },
  });
}

export function useReviewSocietyJoinRequest(societyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: number; status: 'APPROVED' | 'REJECTED' }) =>
      societiesApi.reviewJoinRequest(societyId, requestId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.requests(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.members(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyId) });
    },
  });
}

export function useAddSocietyMember(societyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => societiesApi.addMember(societyId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.members(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.candidates(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
    },
  });
}

export function useRemoveSocietyMember(societyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => societiesApi.removeMember(societyId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.members(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.detail(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.candidates(societyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
    },
  });
}
