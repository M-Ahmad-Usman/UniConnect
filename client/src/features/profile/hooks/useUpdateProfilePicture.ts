import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints/users.api';
import { queryKeys } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';
import type { UserProfile } from '@/types';

export function useUpdateProfilePicture() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: usersApi.updateProfilePicture,
    onSuccess: (updated) => {
      queryClient.setQueryData<UserProfile>(queryKeys.users.me(), (current) =>
        current ? { ...current, profilePictureUrl: updated.profilePictureUrl } : current,
      );

      if (currentUser) {
        setUser({ ...currentUser, profilePictureUrl: updated.profilePictureUrl });
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}
