import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { DEFAULT_PAGE_SIZE, ROUTES } from '@/lib/constants';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { ClassStatus, type Section } from '@/types';
import { parsePositiveInt } from '../utils';
import { useDepartments } from '../hooks/useDepartments';
import { useAdminClasses, useCreateClass, usePrograms } from '../hooks/useAcademicCatalog';
import {
  AdminPageHeader,
  DataState,
  PaginationControls,
  inputClassName,
} from '../components/AdminDataPrimitives';
import { ClassDialog } from '../components/CatalogDialogs';
import type { ClassFormValues } from '../schemas';

function parseSection(value: string | null): Section | undefined {
  return value === 'A' || value === 'B' ? value : undefined;
}

function parseStatus(value: string | null): ClassStatus | 'ALL' | undefined {
  if (value === ClassStatus.ACTIVE || value === ClassStatus.GRADUATED || value === 'ALL') {
    return value;
  }

  return undefined;
}

export function ClassListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const departmentId = parsePositiveInt(searchParams.get('departmentId'));
  const programId = parsePositiveInt(searchParams.get('programId'));
  const semester = parsePositiveInt(searchParams.get('semester'));
  const section = parseSection(searchParams.get('section'));
  const status = parseStatus(searchParams.get('status'));
  const permissionsQuery = useMyPermissions();
  const permissions = permissionsQuery.data;
  const canListClasses = permissions?.global.canAccessAcademicWorkspace ?? false;
  const canAccessAllDepartments = permissions?.global.canAccessAdminDashboard ?? false;
  const hodDepartmentIds = permissions?.scopes.hodDepartmentIds;
  const directedProgramIds = permissions?.scopes.directedProgramIds;
  const selectedScopedDepartmentId =
    !canAccessAllDepartments && departmentId && hodDepartmentIds?.includes(departmentId)
      ? departmentId
      : undefined;
  const effectiveDepartmentId = canAccessAllDepartments ? departmentId : selectedScopedDepartmentId;
  const effectiveDepartmentIds =
    !canAccessAllDepartments && selectedScopedDepartmentId === undefined
      ? hodDepartmentIds
      : undefined;
  const effectiveProgramIds =
    !canAccessAllDepartments && selectedScopedDepartmentId === undefined
      ? directedProgramIds
      : undefined;

  const classesQuery = useAdminClasses({
    page,
    limit: DEFAULT_PAGE_SIZE,
    departmentId: effectiveDepartmentId,
    programId,
    semester,
    section,
    status,
  }, canListClasses);
  const departmentsQuery = useDepartments();
  const programsQuery = usePrograms(
    {
      page: 1,
      limit: 50,
      departmentId: effectiveDepartmentId,
      departmentIds: effectiveDepartmentIds,
      programIds: effectiveProgramIds,
    },
    permissionsQuery.isSuccess && canListClasses,
  );
  const createClass = useCreateClass();
  const departments = useMemo(() => {
    const records = departmentsQuery.data ?? [];
    return canAccessAllDepartments
      ? records
      : records.filter((department) => hodDepartmentIds?.includes(department.id));
  }, [canAccessAllDepartments, departmentsQuery.data, hodDepartmentIds]);
  const lockedDepartment =
    !canAccessAllDepartments && departments.length === 1 && (directedProgramIds?.length ?? 0) === 0
      ? departments[0]
      : null;
  const scopedDepartmentLabel =
    !canAccessAllDepartments && departments.length === 0 ? 'Directed programs' : null;
  const programs = programsQuery.data?.data ?? [];
  const classes = classesQuery.data?.data ?? [];
  const canCreateClass = permissionsQuery.data?.global.canCreateClass ?? false;

  function updateFilter(updates: {
    departmentId?: string;
    programId?: string;
    semester?: string;
    section?: string;
    status?: string;
    page?: number;
  }) {
    const next = new URLSearchParams(searchParams);
    for (const key of ['departmentId', 'programId', 'semester', 'section', 'status'] as const) {
      if (key in updates) {
        const value = updates[key];
        if (value) next.set(key, value);
        else next.delete(key);
      }
    }
    if ('departmentId' in updates) {
      next.delete('programId');
    }
    next.set('page', String(updates.page ?? 1));
    setSearchParams(next);
  }

  async function handleCreate(values: ClassFormValues) {
    await createClass.mutateAsync(values);
  }

  if (!canListClasses && !permissionsQuery.isLoading) {
    return (
      <EmptyState
        title="Academic list unavailable"
        description="You do not have permission to browse managed classes."
      />
    );
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Classes"
        description="Manage class servers and academic class metadata."
        actions={
          canCreateClass ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create class
            </Button>
          ) : null
        }
      />
      <div className="rounded-lg border bg-background p-3">
        <div className="grid gap-3 lg:grid-cols-5">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Department</span>
            {lockedDepartment || scopedDepartmentLabel ? (
              <input
                className={inputClassName}
                value={
                  lockedDepartment
                    ? `${lockedDepartment.code} · ${lockedDepartment.name}`
                    : scopedDepartmentLabel ?? ''
                }
                readOnly
              />
            ) : (
              <select
                className={inputClassName}
                value={effectiveDepartmentId ?? ''}
                onChange={(event) => updateFilter({ departmentId: event.target.value })}
              >
                <option value="">
                  {canAccessAllDepartments ? 'All departments' : 'All scoped departments'}
                </option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Program</span>
            <select className={inputClassName} value={programId ?? ''} onChange={(event) => updateFilter({ programId: event.target.value })}>
              <option value="">All programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Semester</span>
            <input className={inputClassName} type="number" value={semester ?? ''} onChange={(event) => updateFilter({ semester: event.target.value })} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Section</span>
            <select className={inputClassName} value={section ?? ''} onChange={(event) => updateFilter({ section: event.target.value })}>
              <option value="">All sections</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Status</span>
            <select className={inputClassName} value={status ?? ''} onChange={(event) => updateFilter({ status: event.target.value })}>
              <option value="">Active</option>
              <option value={ClassStatus.GRADUATED}>Graduated</option>
              <option value="ALL">All</option>
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-background">
        <DataState
          isLoading={classesQuery.isLoading || permissionsQuery.isLoading}
          isError={classesQuery.isError}
          error={classesQuery.error}
          onRetry={() => void classesQuery.refetch()}
          empty={classes.length === 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Semester</th>
                  <th className="px-4 py-3 font-medium">Section</th>
                  <th className="px-4 py-3 font-medium">Academic year</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">CR</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {classes.map((klass) => (
                  <tr key={klass.publicId}>
                    <td className="px-4 py-3 font-medium">{klass.program.code}</td>
                    <td className="px-4 py-3">{klass.program.department.code}</td>
                    <td className="px-4 py-3">{klass.currentSemester}</td>
                    <td className="px-4 py-3">{klass.section}</td>
                    <td className="px-4 py-3">{klass.academicYear}</td>
                    <td className="px-4 py-3">{klass.status === ClassStatus.GRADUATED ? 'Graduated' : 'Active'}</td>
                    <td className="px-4 py-3">{klass.cr?.user.fullName ?? 'Not assigned'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={ROUTES.ACADEMICS_CLASS(klass.publicId)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                        <Eye className="size-4" />
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </div>
      <PaginationControls
        pagination={classesQuery.data?.pagination}
        onPageChange={(nextPage) => updateFilter({ page: nextPage })}
      />
      <ClassDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        programs={programs}
        loading={createClass.isPending}
        onSubmit={handleCreate}
      />
    </section>
  );
}
