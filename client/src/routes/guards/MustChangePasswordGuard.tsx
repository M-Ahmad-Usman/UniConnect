import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { ROUTES } from '@/lib/constants';

export function MustChangePasswordGuard() {
  const user = useAuthStore((state) => state.user);

  if (user?.mustChangePassword) {
    return <Navigate to={ROUTES.CHANGE_PASSWORD} replace />;
  }

  return <Outlet />;
}
