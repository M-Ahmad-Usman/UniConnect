import { Link, Outlet } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ROUTES } from '@/lib/constants';
import { useMyPermissions } from '@/hooks/useMyPermissions';

export function AcademicGuard() {
  const permissionsQuery = useMyPermissions();

  if (permissionsQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  const canOpenAcademicRoute =
    permissionsQuery.data?.global.canAccessAcademicWorkspace ?? false;

  if (!canOpenAcademicRoute) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">
          You do not have permission to access academic management.
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
