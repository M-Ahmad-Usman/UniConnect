import { usersApi } from '@/api/endpoints/users.api';
import { mapProfileToAuthUser } from '@/lib/auth-user';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';
import type { ScopedRoleAssignment } from '@/types';

export function invalidateRoleSensitiveQueries(): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.me() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.societies.all() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all() });
}

export async function refreshRoleSensitiveSession(): Promise<void> {
  const profile = await usersApi.getMe();
  useAuthStore.getState().setUser(mapProfileToAuthUser(profile));
  queryClient.setQueryData(queryKeys.users.me(), profile);
  invalidateRoleSensitiveQueries();
}

export function getNearestRoleExpiryDelay(
  roles: ScopedRoleAssignment[] | undefined,
  now = Date.now(),
): number | null {
  const expiries = (roles ?? [])
    .map((role) => (role.expiresAt ? new Date(role.expiresAt).getTime() : Number.NaN))
    .filter((expiry) => Number.isFinite(expiry) && expiry > now);

  if (expiries.length === 0) return null;
  return Math.min(...expiries) - now;
}
