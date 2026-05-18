import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/api/endpoints/roles.api';
import { queryKeys } from '@/lib/constants';
import type { AssignRoleRequest, RevokeRoleRequest } from '@/types';

export function useUserRoles(userId: number | null) {
  return useQuery({
    queryKey: userId ? queryKeys.roles.byUser(userId) : ['roles', 'idle'],
    queryFn: () => rolesApi.getUserRoles(userId!),
    enabled: userId !== null,
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignRoleRequest) => rolesApi.assign(payload),
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles.byUser(payload.userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.societies.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
    },
  });
}

export function useRevokeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RevokeRoleRequest) => rolesApi.revoke(payload),
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles.byUser(payload.userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
    },
  });
}
