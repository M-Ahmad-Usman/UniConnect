import type { AuthUser, ScopedRoleAssignment } from '@/types';

export function hasAdminRole(roles: ScopedRoleAssignment[] | undefined): boolean {
  return roles?.some((role) => role.role === 'admin' && role.scopeType === 'global') ?? false;
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return hasAdminRole(user?.roles);
}
