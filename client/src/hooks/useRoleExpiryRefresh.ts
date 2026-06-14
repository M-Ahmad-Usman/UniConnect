import { useEffect } from 'react';
import { getNearestRoleExpiryDelay, refreshRoleSensitiveSession } from '@/lib/role-session';
import type { ScopedRoleAssignment } from '@/types';

const MAX_TIMEOUT_MS = 2_147_000_000;
const EXPIRY_GRACE_MS = 100;
const RETRY_DELAY_MS = 30_000;

export function useRoleExpiryRefresh(
  roles: ScopedRoleAssignment[] | undefined,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timeoutId: number | undefined;

    async function refresh() {
      try {
        await refreshRoleSensitiveSession();
      } catch (error) {
        console.warn('[AUTH] Failed to refresh session after role expiry', { error });
        if (!cancelled) {
          timeoutId = window.setTimeout(refresh, RETRY_DELAY_MS);
        }
      }
    }

    function schedule() {
      const delay = getNearestRoleExpiryDelay(roles);
      if (delay === null || cancelled) return;
      timeoutId = window.setTimeout(refresh, Math.min(delay + EXPIRY_GRACE_MS, MAX_TIMEOUT_MS));
    }

    schedule();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [enabled, roles]);
}
