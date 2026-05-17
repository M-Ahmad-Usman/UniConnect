import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { DEFAULT_PAGE_SIZE, ROUTES } from '@/lib/constants';
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
import type { Section } from '@/types';

function parseSection(value: string | null): Section | undefined {
  return value === 'A' || value === 'B' ? value : undefined;
}

export function ClassListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const departmentId = parsePositiveInt(searchParams.get('departmentId'));
  const programId = parsePositiveInt(searchParams.get('programId'));
  const semester = parsePositiveInt(searchParams.get('semester'));
  const section = parseSection(searchParams.get('section'));

  const classesQuery = useAdminClasses({
    page,
    limit: DEFAULT_PAGE_SIZE,
    departmentId,
    programId,
    semester,
    section,
  });
  const departmentsQuery = useDepartments();
  const programsQuery = usePrograms({ page: 1, limit: 50, departmentId });
  const createClass = useCreateClass();
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const programs = programsQuery.data?.data ?? [];
  const classes = classesQuery.data?.data ?? [];

  function updateFilter(updates: {
    departmentId?: string;
    programId?: string;
    semester?: string;
    section?: string;
    page?: number;
  }) {
    const next = new URLSearchParams(searchParams);
    for (const key of ['departmentId', 'programId', 'semester', 'section'] as const) {
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

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Classes"
        description="Manage class servers and academic class metadata."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create class
          </Button>
        }
      />
      <div className="rounded-lg border bg-background p-3">
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Department</span>
            <select className={inputClassName} value={departmentId ?? ''} onChange={(event) => updateFilter({ departmentId: event.target.value })}>
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code}
                </option>
              ))}
            </select>
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
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-background">
        <DataState
          isLoading={classesQuery.isLoading}
          isError={classesQuery.isError}
          onRetry={() => void classesQuery.refetch()}
          empty={classes.length === 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Semester</th>
                  <th className="px-4 py-3 font-medium">Section</th>
                  <th className="px-4 py-3 font-medium">Academic year</th>
                  <th className="px-4 py-3 font-medium">CR</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {classes.map((klass) => (
                  <tr key={klass.id}>
                    <td className="px-4 py-3 font-medium">{klass.program.code}</td>
                    <td className="px-4 py-3">{klass.program.department.code}</td>
                    <td className="px-4 py-3">{klass.currentSemester}</td>
                    <td className="px-4 py-3">{klass.section}</td>
                    <td className="px-4 py-3">{klass.academicYear}</td>
                    <td className="px-4 py-3">{klass.cr?.user.fullName ?? 'Not assigned'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={ROUTES.ADMIN_CLASS(klass.id)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
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
