import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Edit, Search } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { parsePositiveInt } from '../utils';
import { useDepartments } from '../hooks/useDepartments';
import {
  useDegreeLevels,
  useDisciplines,
  usePrograms,
  useUpdateProgram,
} from '../hooks/useAcademicCatalog';
import { AdminPageHeader, DataState, PaginationControls, inputClassName } from '../components/AdminDataPrimitives';
import { ProgramDialog } from '../components/CatalogDialogs';
import type { ProgramDetail, ProgramListItem } from '@/types';
import type { ProgramFormValues, UpdateProgramFormValues } from '../schemas';

export function ProgramListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingProgram, setEditingProgram] = useState<ProgramListItem | null>(null);
  const searchParamValue = searchParams.get('search') ?? '';
  const [searchValue, setSearchValue] = useState(searchParamValue);
  const debouncedSearch = useDebouncedValue(searchValue.trim(), 300);
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const departmentId = parsePositiveInt(searchParams.get('departmentId'));
  const search = searchParamValue.trim() || undefined;

  const programsQuery = usePrograms({ page, limit: DEFAULT_PAGE_SIZE, departmentId, search });
  const departmentsQuery = useDepartments();
  const disciplinesQuery = useDisciplines();
  const degreeLevelsQuery = useDegreeLevels();
  const updateProgram = useUpdateProgram(editingProgram?.id ?? 0);
  const programs = programsQuery.data?.data ?? [];
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);

  useEffect(() => {
    setSearchValue(searchParamValue);
  }, [searchParamValue]);

  useEffect(() => {
    if (debouncedSearch === searchParamValue) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      next.set('search', debouncedSearch);
    } else {
      next.delete('search');
    }
    next.delete('page');
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParamValue, searchParams, setSearchParams]);

  function updateFilter(updates: { departmentId?: string; page?: number }) {
    const next = new URLSearchParams(searchParams);
    if ('departmentId' in updates) {
      if (updates.departmentId) next.set('departmentId', updates.departmentId);
      else next.delete('departmentId');
    }
    next.set('page', String(updates.page ?? 1));
    setSearchParams(next);
  }

  async function handleUpdate(values: ProgramFormValues | UpdateProgramFormValues) {
    await updateProgram.mutateAsync(values as UpdateProgramFormValues);
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Programs"
        description="Browse and update program codes and semester counts across departments."
      />
      <div className="rounded-lg border bg-background p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_16rem]">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${inputClassName} pl-8`}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </span>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Department</span>
            <select
              className={inputClassName}
              value={departmentId ?? ''}
              onChange={(event) => updateFilter({ departmentId: event.target.value })}
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
      </div>
      <div className="overflow-hidden rounded-lg border bg-background">
        <DataState
          isLoading={programsQuery.isLoading}
          isError={programsQuery.isError}
          onRetry={() => void programsQuery.refetch()}
          empty={programs.length === 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Discipline</th>
                  <th className="px-4 py-3 font-medium">Degree</th>
                  <th className="px-4 py-3 font-medium">Semesters</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {programs.map((program: ProgramDetail) => (
                  <tr key={program.id}>
                    <td className="px-4 py-3 font-medium">{program.code}</td>
                    <td className="px-4 py-3">{program.department.code}</td>
                    <td className="px-4 py-3">{program.discipline.name}</td>
                    <td className="px-4 py-3">{program.degreeLevel.level}</td>
                    <td className="px-4 py-3">{program.semesters}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={ROUTES.ADMIN_PROGRAM_CURRICULUM(program.id)}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          Curriculum
                        </Link>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditingProgram(program)}>
                          <Edit className="size-4" />
                          <span className="sr-only">Edit program</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </div>
      <PaginationControls
        pagination={programsQuery.data?.pagination}
        onPageChange={(nextPage) => updateFilter({ page: nextPage })}
      />
      <ProgramDialog
        open={editingProgram !== null}
        onOpenChange={(open) => !open && setEditingProgram(null)}
        initial={editingProgram ?? undefined}
        disciplines={disciplinesQuery.data ?? []}
        degreeLevels={degreeLevelsQuery.data ?? []}
        loading={updateProgram.isPending}
        onSubmit={handleUpdate}
      />
    </section>
  );
}
