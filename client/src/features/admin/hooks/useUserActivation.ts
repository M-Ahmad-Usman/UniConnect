import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints/users.api';
import { queryKeys } from '@/lib/constants';
import type {
  UpdateUserStatusRequest,
  UserDetail,
  UserLifecycleReasonRequest,
  UserListItem,
} from '@/types';

function patchUserDetail(
  queryClient: ReturnType<typeof useQueryClient>,
  userPublicId: string,
  patch: Partial<UserListItem & UserDetail>,
) {
  queryClient.setQueriesData<{ data: UserListItem[] }>(
    { queryKey: queryKeys.admin.usersRoot() },
    (current) =>
      current
        ? {
            ...current,
            data: current.data.map((user) =>
              user.publicId === userPublicId ? { ...user, ...patch } : user,
            ),
          }
        : current,
  );

  queryClient.setQueryData<UserDetail>(queryKeys.users.detail(userPublicId), (current) =>
    current ? { ...current, ...patch } : current,
  );
}

export function useUserDeletionImpact(userPublicId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: userPublicId
      ? queryKeys.users.deletionImpact(userPublicId)
      : ['users', 'deletion-impact', null],
    queryFn: () => usersApi.getDeletionImpact(userPublicId!),
    enabled: enabled && userPublicId !== null,
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userPublicId, payload }: { userPublicId: string; payload: UpdateUserStatusRequest }) =>
      usersApi.updateStatus(userPublicId, payload),
    onSuccess: (user, variables) => {
      patchUserDetail(queryClient, variables.userPublicId, {
        status: user.status,
        isDeleted: user.isDeleted,
        deletedAt: user.deletedAt,
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userPublicId, payload }: { userPublicId: string; payload: UserLifecycleReasonRequest }) =>
      usersApi.delete(userPublicId, payload),
    onSuccess: (user, variables) => {
      patchUserDetail(queryClient, variables.userPublicId, {
        status: user.status,
        isDeleted: user.isDeleted,
        deletedAt: user.deletedAt,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.deletionImpact(variables.userPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.usersRoot() });
    },
  });
}

export function useRestoreUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userPublicId, payload }: { userPublicId: string; payload: UserLifecycleReasonRequest }) =>
      usersApi.restore(userPublicId, payload),
    onSuccess: (user, variables) => {
      patchUserDetail(queryClient, variables.userPublicId, {
        status: user.status,
        isDeleted: user.isDeleted,
        deletedAt: user.deletedAt,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.deletionImpact(variables.userPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.usersRoot() });
    },
  });
}
