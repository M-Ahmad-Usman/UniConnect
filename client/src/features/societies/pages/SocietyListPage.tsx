import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_PAGE_SIZE, ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';
import { UserType } from '@/types';
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
  const user = useAuthStore((state) => state.user);
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const departmentId = parsePositiveInt(searchParams.get('departmentId'));
  const societiesQuery = useSocieties({ page, limit: DEFAULT_PAGE_SIZE, departmentId });
  const departmentsQuery = useDepartments();
  const permissionsQuery = useMyPermissions();
  const createSociety = useCreateSociety();
  const departments = useMemo(() => {
    const allDepartments = departmentsQuery.data ?? [];
    if (user?.userType === UserType.ADMIN) {
      return allDepartments;
    }

    const hodDepartmentIds = new Set(permissionsQuery.data?.scopes.hodDepartmentIds ?? []);
    return allDepartments.filter((department) => hodDepartmentIds.has(department.id));
  }, [departmentsQuery.data, permissionsQuery.data, user?.userType]);
  const canCreate = permissionsQuery.data?.global.canCreateSociety ?? false;

  function updateFilter(nextDepartmentId: string, nextPage = 1) {
    const next = new URLSearchParams(searchParams);
    if (nextDepartmentId) next.set('departmentId', nextDepartmentId);
    else next.delete('departmentId');
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
      <div className="rounded-lg border bg-background p-3">
        <label className="block max-w-xs space-y-1.5">
          <span className="text-sm font-medium">Department</span>
          <select
            className={inputClassName}
            value={departmentId ?? ''}
            onChange={(event) => updateFilter(event.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code}
              </option>
            ))}
          </select>
        </label>
      </div>
      <DataState
        isLoading={societiesQuery.isLoading}
        isError={societiesQuery.isError}
        onRetry={() => void societiesQuery.refetch()}
        empty={societies.length === 0}
      >
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {societies.map((society) => (
            <article key={society.id} className="rounded-lg border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">{society.name}</h2>
                  <p className="text-sm text-muted-foreground">{society.department.name}</p>
                </div>
                <Badge variant={society.isActive ? 'default' : 'secondary'}>
                  {society.isActive ? 'Active' : 'Inactive'}
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
                  to={ROUTES.SOCIETY(society.id)}
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
        onPageChange={(nextPage) => updateFilter(String(departmentId ?? ''), nextPage)}
      />
      <SocietyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        departments={departments}
        loading={createSociety.isPending}
        onSubmit={handleCreate}
      />
    </section>
  );
}
