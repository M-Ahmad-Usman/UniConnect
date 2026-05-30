import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/api/endpoints/roles.api';
import { queryKeys } from '@/lib/constants';
import type {
  AssignableChannelsParams,
  AssignableScopesParams,
  AssignableUsersParams,
  AssignRoleRequest,
  PlatformAssignmentHistoryParams,
  RevokeRoleRequest,
  RevokableRolesParams,
  UpdatePlatformAssignmentExpiryRequest,
} from '@/types';

export function useAssignableRoles(enabled = true) {
  return useQuery({
    queryKey: queryKeys.roles.assignable(),
    queryFn: rolesApi.getAssignableRoles,
    enabled,
  });
}

export function useAssignableRoleScopes(params: AssignableScopesParams | null) {
  return useQuery({
    queryKey: params
      ? queryKeys.roles.assignableScopes(params)
      : ['roles', 'assignable-scopes', 'idle'],
    queryFn: () => rolesApi.listAssignableScopes(params!),
    enabled: params !== null,
  });
}

export function useAssignableChannels(params: AssignableChannelsParams | null) {
  return useQuery({
    queryKey: params
      ? queryKeys.roles.assignableChannels(params)
      : ['roles', 'assignable-channels', 'idle'],
    queryFn: () => rolesApi.listAssignableChannels(params!),
    enabled: params !== null,
  });
}

export function useAssignableRoleUsers(params: AssignableUsersParams | null) {
  return useQuery({
    queryKey: params
      ? queryKeys.roles.assignableUsers(params)
      : ['roles', 'assignable-users', 'idle'],
    queryFn: () => rolesApi.listAssignableUsers(params!),
    enabled: params !== null,
  });
}

export function useRevokableRoleAssignments(params: RevokableRolesParams | null) {
  return useQuery({
    queryKey: params ? queryKeys.roles.revokable(params) : ['roles', 'revokable', 'idle'],
    queryFn: () => rolesApi.listRevokable(params!),
    enabled: params !== null,
  });
}

export function useUserRoles(userPublicId: string | null) {
  return useQuery({
    queryKey: userPublicId ? queryKeys.roles.byUser(userPublicId) : ['roles', 'idle'],
    queryFn: () => rolesApi.getUserRoles(userPublicId!),
    enabled: userPublicId !== null,
  });
}

function invalidateRoleQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.me() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.societies.all() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignRoleRequest) => rolesApi.assign(payload),
    onSuccess: () => {
      invalidateRoleQueries(queryClient);
    },
  });
}

export function useRevokeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RevokeRoleRequest) => rolesApi.revoke(payload),
    onSuccess: () => {
      invalidateRoleQueries(queryClient);
    },
  });
}

export function useUpdatePlatformAssignmentExpiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePlatformAssignmentExpiryRequest) =>
      rolesApi.updatePlatformAssignmentExpiry(payload),
    onSuccess: () => {
      invalidateRoleQueries(queryClient);
    },
  });
}

export function usePlatformAssignmentHistory(
  params: PlatformAssignmentHistoryParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.roles.history(params),
    queryFn: () => rolesApi.listPlatformAssignmentHistory(params),
    enabled,
  });
}
