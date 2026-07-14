import { Link, Outlet } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ROUTES } from '@/lib/constants';
import { useMyPermissions } from '@/hooks/useMyPermissions';

export function TeachingGuard() {
  const permissions = useMyPermissions();
  if (permissions.isLoading) return <LoadingSpinner fullPage />;

  if (permissions.isError || !permissions.data?.global.canAccessTeachingWorkspace) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-muted-foreground mt-2">
          This workspace is available to active teachers.
        </p>
        <Link className="text-primary mt-4 text-sm font-medium hover:underline" to={ROUTES.HOME}>
          Go home
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
