import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints/users.api';
import { queryKeys } from '@/lib/constants';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
