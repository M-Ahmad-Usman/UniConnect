import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { ROUTES } from '@/lib/constants';

export function ForceChangePasswordGuard() {
  const { user, requiresPasswordChange } = useAuthStore();

  if (requiresPasswordChange || user?.mustChangePassword) {
    return <Outlet />;
  }

  return <Navigate to={ROUTES.SETTINGS_PASSWORD} replace />;
}
