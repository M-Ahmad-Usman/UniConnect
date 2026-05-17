import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints/users.api';
import { queryKeys } from '@/lib/constants';
import type { UserDetail, UserListItem } from '@/types';

function patchUserStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: number,
  isActive: boolean,
) {
  queryClient.setQueriesData<{ data: UserListItem[] }>(
    { queryKey: queryKeys.admin.usersRoot() },
    (current) =>
      current
        ? {
            ...current,
            data: current.data.map((user) => (user.id === userId ? { ...user, isActive } : user)),
          }
        : current,
  );

  queryClient.setQueryData<UserDetail>(queryKeys.users.detail(userId), (current) =>
    current ? { ...current, isActive } : current,
  );
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: (_result, userId) => {
      patchUserStatus(queryClient, userId, false);
    },
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.reactivate,
    onSuccess: (_result, userId) => {
      patchUserStatus(queryClient, userId, true);
    },
  });
}
