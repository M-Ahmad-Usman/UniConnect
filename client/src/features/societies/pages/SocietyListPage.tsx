import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_PAGE_SIZE, ROUTES } from '@/lib/constants';
import { SocietyStatus } from '@/types';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { parsePositiveInt } from '@/features/admin/utils';
import { useDepartments } from '@/features/admin/hooks/useDepartments';
import {
  AdminPageHeader,
  DataState,
  PaginationControls,
  inputClassName,
} from '@/features/admin/components/AdminDataPrimitives';
import { useCreateSociety, useSocieties } from '../hooks/useSocieties';
import { SocietyDialog } from '../components/SocietyDialogs';
import type { SocietyFormValues } from '../schemas';

export function SocietyListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const departmentId = parsePositiveInt(searchParams.get('departmentId'));
  const status =
    searchParams.get('status') === SocietyStatus.ACTIVE ||
    searchParams.get('status') === SocietyStatus.SUSPENDED
      ? (searchParams.get('status') as typeof SocietyStatus.ACTIVE | typeof SocietyStatus.SUSPENDED)
      : undefined;
  const lifecycle =
    searchParams.get('lifecycle') === 'deleted' || searchParams.get('lifecycle') === 'all'
      ? (searchParams.get('lifecycle') as 'deleted' | 'all')
      : undefined;
  const departmentsQuery = useDepartments();
  const permissionsQuery = useMyPermissions();
  const createSociety = useCreateSociety();
  const canAccessAllDepartments =
    permissionsQuery.data?.global.canAccessAdminDashboard ?? false;
  const departments = useMemo(() => {
    const allDepartments = departmentsQuery.data ?? [];
    if (canAccessAllDepartments) {
      return allDepartments;
    }

    const hodDepartmentIds = new Set(permissionsQuery.data?.scopes.hodDepartmentIds ?? []);
    return allDepartments.filter((department) => hodDepartmentIds.has(department.id));
  }, [canAccessAllDepartments, departmentsQuery.data, permissionsQuery.data]);
  const lockedDepartment =
    !canAccessAllDepartments && departments.length === 1 ? departments[0] : null;
  const effectiveDepartmentId = lockedDepartment?.id ?? departmentId;
  const societiesQuery = useSocieties({
    page,
    limit: DEFAULT_PAGE_SIZE,
    departmentId: effectiveDepartmentId,
    status,
    lifecycle,
  });
  const canCreate = permissionsQuery.data?.global.canCreateSociety ?? false;
  const canManageLifecycle =
    canAccessAllDepartments ||
    (permissionsQuery.data?.scopes.hodDepartmentIds.length ?? 0) > 0;

  function updateFilter(
    updates: { departmentId?: string; status?: string; lifecycle?: string },
    nextPage = 1,
  ) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  async function handleCreate(values: SocietyFormValues) {
    await createSociety.mutateAsync(values);
  }

  const societies = societiesQuery.data?.data ?? [];

  return (
    <section className="space-y-5">
      <AdminPageHeader
        eyebrow="Societies"
        title="Society Management"
        description="Browse societies, inspect leadership, and manage society membership workflows."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create society
            </Button>
          ) : null
        }
      />
      <div className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Department</span>
          {lockedDepartment ? (
            <input
              className={inputClassName}
              value={`${lockedDepartment.code} · ${lockedDepartment.name}`}
              readOnly
            />
          ) : (
            <select
              className={inputClassName}
              value={effectiveDepartmentId ?? ''}
              onChange={(event) => updateFilter({ departmentId: event.target.value })}
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code}
                </option>
              ))}
            </select>
          )}
        </label>
        {canManageLifecycle ? (
          <>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Status</span>
              <select
                className={inputClassName}
                value={status ?? ''}
                onChange={(event) => updateFilter({ status: event.target.value })}
              >
                <option value="">Any status</option>
                <option value={SocietyStatus.ACTIVE}>Active</option>
                <option value={SocietyStatus.SUSPENDED}>Suspended</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Lifecycle</span>
              <select
                className={inputClassName}
                value={lifecycle ?? 'live'}
                onChange={(event) =>
                  updateFilter({
                    lifecycle: event.target.value === 'live' ? '' : event.target.value,
                  })
                }
              >
                <option value="live">Live</option>
                <option value="deleted">Deleted</option>
                <option value="all">All</option>
              </select>
            </label>
          </>
        ) : null}
      </div>
      <DataState
        isLoading={societiesQuery.isLoading}
        isError={societiesQuery.isError}
        onRetry={() => void societiesQuery.refetch()}
        empty={societies.length === 0}
      >
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {societies.map((society) => (
            <article key={society.publicId} className="rounded-lg border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">{society.name}</h2>
                  <p className="text-sm text-muted-foreground">{society.department.name}</p>
                </div>
                <Badge variant={society.isDeleted ? 'destructive' : society.status === SocietyStatus.ACTIVE ? 'default' : 'secondary'}>
                  {society.isDeleted ? 'Deleted' : society.status === SocietyStatus.ACTIVE ? 'Active' : 'Suspended'}
                </Badge>
              </div>
              {society.description ? (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{society.description}</p>
              ) : null}
              <dl className="mt-4 grid gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">President</dt>
                  <dd className="font-medium">{society.president.user.fullName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Convenor</dt>
                  <dd className="font-medium">{society.convenor.user.fullName}</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="size-4" />
                  {society.server._count.memberships} members
                </span>
                <Link
                  to={ROUTES.SOCIETY(society.publicId)}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <Eye className="size-4" />
                  Open
                </Link>
              </div>
            </article>
          ))}
        </div>
      </DataState>
      <PaginationControls
        pagination={societiesQuery.data?.pagination}
        onPageChange={(nextPage) => updateFilter({}, nextPage)}
      />
      <SocietyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        departments={departments}
        lockDepartment={!canAccessAllDepartments}
        loading={createSociety.isPending}
        onSubmit={handleCreate}
      />
    </section>
  );
}
