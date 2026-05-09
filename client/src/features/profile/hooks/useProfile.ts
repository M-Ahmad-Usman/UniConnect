import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints/users.api';
import { isAuthUserSyncedWithProfile, mapProfileToAuthUser } from '@/lib/auth-user';
import { queryKeys } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';

export function useProfile() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const query = useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: usersApi.getMe,
  });

  useEffect(() => {
    if (!query.data || !user || query.data.id !== user.id) {
      return;
    }

    if (isAuthUserSyncedWithProfile(user, query.data)) {
      return;
    }

    setUser(mapProfileToAuthUser(query.data));
  }, [query.data, setUser, user]);

  return query;
}
