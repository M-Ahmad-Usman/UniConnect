import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints/users.api';
import { queryKeys } from '@/lib/constants';
import type { UserProfile } from '@/types';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData<UserProfile>(queryKeys.users.me(), (current) =>
        current ? { ...current, bio: updated.bio } : current,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}
