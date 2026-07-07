import { Link, Outlet } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ROUTES } from '@/lib/constants';
import { getApiErrorCopy } from '@/lib/api-error';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { ApiError } from '@/types';

export function EnrollmentGuard() {
  const permissionsQuery = useMyPermissions();

  if (permissionsQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (permissionsQuery.isError) {
    const copy = getApiErrorCopy(permissionsQuery.error);
    const requestId =
      permissionsQuery.error instanceof ApiError ? permissionsQuery.error.requestId : undefined;
    const description = requestId ? `${copy.message} Request ID: ${requestId}` : copy.message;

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <EmptyState
          icon={RotateCcw}
          title={copy.title}
          description={description}
          action={copy.retryable ? { label: 'Retry', onClick: () => void permissionsQuery.refetch() } : undefined}
        />
      </div>
    );
  }

  const canOpenEnrollmentRoute =
    permissionsQuery.data?.global.canAccessEnrollmentWorkspace ?? false;

  if (!canOpenEnrollmentRoute) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to access enrollment.
        </p>
        <Link
          to={ROUTES.HOME}
          className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
