import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Edit, Plus, Search } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { parsePositiveInt } from '../utils';
import { useDepartments } from '../hooks/useDepartments';
import {
  useDegreeLevels,
  useDisciplines,
  useCreateGlobalProgram,
  usePrograms,
  useUpdateProgram,
} from '../hooks/useAcademicCatalog';
import {
  AdminPageHeader,
  DataState,
  PaginationControls,
  inputClassName,
} from '../components/AdminDataPrimitives';
import { GlobalProgramDialog, ProgramDialog } from '../components/CatalogDialogs';
import type { ProgramDetail, ProgramListItem } from '@/types';
import type {
  GlobalProgramFormValues,
  ProgramFormValues,
  UpdateProgramFormValues,
} from '../schemas';

export function ProgramListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramListItem | null>(null);
  const [pendingReduction, setPendingReduction] = useState<UpdateProgramFormValues | null>(null);
  const searchParamValue = searchParams.get('search') ?? '';
  const [searchState, setSearchState] = useState({
    source: searchParamValue,
    value: searchParamValue,
  });
  const searchValue =
    searchState.source === searchParamValue ? searchState.value : searchParamValue;
  const debouncedSearch = useDebouncedValue(searchValue.trim(), 300);
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const departmentId = parsePositiveInt(searchParams.get('departmentId'));
  const search = searchParamValue.trim() || undefined;
  const permissionsQuery = useMyPermissions();
  const permissions = permissionsQuery.data;
  const canManageProgramCatalog = permissions?.global.canAccessAdminDashboard ?? false;
  const hodDepartmentIds = permissions?.scopes.hodDepartmentIds;
  const directedProgramIds = permissions?.scopes.directedProgramIds;
  const selectedScopedDepartmentId =
    !canManageProgramCatalog && departmentId && hodDepartmentIds?.includes(departmentId)
      ? departmentId
      : undefined;
  const effectiveDepartmentId = canManageProgramCatalog ? departmentId : selectedScopedDepartmentId;
  const effectiveDepartmentIds =
    !canManageProgramCatalog && selectedScopedDepartmentId === undefined
      ? hodDepartmentIds
      : undefined;
  const effectiveProgramIds =
    !canManageProgramCatalog && selectedScopedDepartmentId === undefined
      ? directedProgramIds
      : undefined;
  const canListPrograms =
    canManageProgramCatalog ||
    selectedScopedDepartmentId !== undefined ||
    (hodDepartmentIds?.length ?? 0) > 0 ||
    (directedProgramIds?.length ?? 0) > 0;

  const programsQuery = usePrograms(
    {
      page,
      limit: DEFAULT_PAGE_SIZE,
      departmentId: effectiveDepartmentId,
      departmentIds: effectiveDepartmentIds,
      programIds: effectiveProgramIds,
      search,
    },
    permissionsQuery.isSuccess && canListPrograms,
  );
  const departmentsQuery = useDepartments();
  const disciplinesQuery = useDisciplines();
  const degreeLevelsQuery = useDegreeLevels();
  const createProgram = useCreateGlobalProgram();
  const updateProgram = useUpdateProgram(editingProgram?.id ?? 0);
  const programs = programsQuery.data?.data ?? [];
  const departments = useMemo(() => {
    const records = departmentsQuery.data ?? [];
    return canManageProgramCatalog
      ? records
      : records.filter((department) => hodDepartmentIds?.includes(department.id));
  }, [canManageProgramCatalog, departmentsQuery.data, hodDepartmentIds]);
  const lockedDepartment =
    !canManageProgramCatalog &&
    departments.length === 1 &&
    (directedProgramIds?.length ?? 0) === 0
      ? departments[0]
      : null;
  const scopedDepartmentLabel =
    !canManageProgramCatalog && departments.length === 0 ? 'Directed programs' : null;

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
    const updateValues = values as UpdateProgramFormValues;
    if (
      editingProgram &&
      updateValues.semesters < editingProgram.semesters &&
      (editingProgram._count?.curriculum ?? 0) > 0
    ) {
      setPendingReduction(updateValues);
      return false;
    }

    await updateProgram.mutateAsync(updateValues);
    return undefined;
  }

  async function confirmSemesterReduction() {
    if (!pendingReduction) return;
    await updateProgram.mutateAsync({
      ...pendingReduction,
      confirmSemesterReduction: true,
    });
    setPendingReduction(null);
    setEditingProgram(null);
  }

  async function handleCreate(values: GlobalProgramFormValues) {
    const { departmentId: selectedDepartmentId, ...payload } = values;
    await createProgram.mutateAsync({ departmentId: selectedDepartmentId, payload });
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        eyebrow="Academics"
        title="Programs"
        description={
          canManageProgramCatalog
            ? 'Browse, create, and update program codes and semester counts across departments.'
            : 'Browse scoped programs and manage curriculum for your academic role.'
        }
        actions={
          canManageProgramCatalog ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create program
            </Button>
          ) : null
        }
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
                onChange={(event) =>
                  setSearchState({ source: searchParamValue, value: event.target.value })
                }
              />
            </span>
          </label>
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
                {canManageProgramCatalog ? <option value="">All departments</option> : null}
                {!canManageProgramCatalog ? <option value="">All scoped programs</option> : null}
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-background">
        <DataState
          isLoading={programsQuery.isLoading || permissionsQuery.isLoading}
          isError={programsQuery.isError}
          error={programsQuery.error}
          onRetry={() => void programsQuery.refetch()}
          empty={programs.length === 0}
          emptyTitle="No programs found"
          emptyDescription="No programs match the current scope or filters."
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
                          to={ROUTES.ACADEMICS_PROGRAM_CURRICULUM(program.id)}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          Curriculum
                        </Link>
                        {canManageProgramCatalog ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditingProgram(program)}
                          >
                            <Edit className="size-4" />
                            <span className="sr-only">Edit program</span>
                          </Button>
                        ) : null}
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
      {canManageProgramCatalog ? (
        <>
          <GlobalProgramDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            departments={departments}
            disciplines={disciplinesQuery.data ?? []}
            degreeLevels={degreeLevelsQuery.data ?? []}
            loading={createProgram.isPending}
            onSubmit={handleCreate}
          />
          <ProgramDialog
            open={editingProgram !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingProgram(null);
                setPendingReduction(null);
              }
            }}
            initial={editingProgram ?? undefined}
            disciplines={disciplinesQuery.data ?? []}
            degreeLevels={degreeLevelsQuery.data ?? []}
            loading={updateProgram.isPending}
            onSubmit={handleUpdate}
          />
          <ConfirmDialog
            open={pendingReduction !== null}
            onOpenChange={(open) => {
              if (!open) setPendingReduction(null);
            }}
            title="Reduce program semesters?"
            description="Curriculum entries above the new semester count will be deleted. This is only allowed because no classes are enrolled in this program."
            confirmLabel="Reduce semesters"
            variant="destructive"
            onConfirm={confirmSemesterReduction}
          />
        </>
      ) : null}
    </section>
  );
}
