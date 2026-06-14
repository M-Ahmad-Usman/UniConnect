import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { UserType } from '@/types/enums';
import { ROUTES } from '@/lib/constants';

export function AdminGuard() {
  const user = useAuthStore((state) => state.user);

  if (user?.userType !== UserType.ADMIN) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">
          You do not have permission to access this page.
        </p>
        <Link
          to={ROUTES.HOME}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
