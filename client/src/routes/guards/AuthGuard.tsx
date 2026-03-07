import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { usersApi } from '@/api/endpoints/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { ROUTES } from '@/lib/constants';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { ApiError } from '@/types';
import type { AuthUser } from '@/types/auth.types';
import type { UserProfile } from '@/types/user.types';

export function AuthGuard() {
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    isLoading,
    requiresPasswordChange,
    setUser,
    clearUser,
    markPasswordChangeRequired,
  } = useAuthStore();

  const isForceChangePasswordRoute = location.pathname === ROUTES.CHANGE_PASSWORD;

  useEffect(() => {
    if (isAuthenticated || requiresPasswordChange) return;

    let cancelled = false;

    async function checkSession() {
      try {
        const profile: UserProfile = await usersApi.getMe();
        if (cancelled) return;

        const authUser: AuthUser = {
          id: profile.id,
          fullName: profile.fullName,
          email: profile.email,
          userType: profile.userType,
          mustChangePassword: profile.mustChangePassword,
        };
        setUser(authUser);
      } catch (error) {
        if (cancelled) return;

        if (
          error instanceof ApiError &&
          error.statusCode === 403 &&
          error.message.includes('Password change required')
        ) {
          markPasswordChangeRequired();
          return;
        }

        clearUser();
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, requiresPasswordChange, setUser, clearUser, markPasswordChangeRequired]);

  useEffect(() => {
    if (isAuthenticated && !user?.mustChangePassword && !requiresPasswordChange) {
      connectSocket();

      return () => {
        disconnectSocket();
      };
    }

    disconnectSocket();
  }, [isAuthenticated, user?.mustChangePassword, requiresPasswordChange]);

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (requiresPasswordChange) {
    if (isForceChangePasswordRoute) {
      return <Outlet />;
    }

    return <Navigate to={ROUTES.CHANGE_PASSWORD} replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
