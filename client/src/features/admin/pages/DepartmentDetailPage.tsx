import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Edit, GraduationCap, Plus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ROUTES } from '@/lib/constants';
import { parsePositiveInt } from '../utils';
import { useDepartmentPrograms } from '../hooks/useDepartmentPrograms';
import {
  useCreateProgram,
  useDegreeLevels,
  useDepartment,
  useDepartmentStats,
  useDisciplines,
  useUpdateDepartment,
  useUpdateProgram,
} from '../hooks/useAcademicCatalog';
import { AdminPageHeader, DataState } from '../components/AdminDataPrimitives';
import { DepartmentDialog, ProgramDialog } from '../components/CatalogDialogs';
import type { ProgramListItem } from '@/types';
import type { DepartmentFormValues, ProgramFormValues, UpdateProgramFormValues } from '../schemas';

export function DepartmentDetailPage() {
  const departmentId = parsePositiveInt(useParams().departmentId ?? null) ?? null;
  const [editDepartmentOpen, setEditDepartmentOpen] = useState(false);
  const [createProgramOpen, setCreateProgramOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramListItem | null>(null);

  const departmentQuery = useDepartment(departmentId);
  const statsQuery = useDepartmentStats(departmentId);
  const programsQuery = useDepartmentPrograms(departmentId);
  const disciplinesQuery = useDisciplines();
  const degreeLevelsQuery = useDegreeLevels();
  const updateDepartment = useUpdateDepartment(departmentId ?? 0);
  const createProgram = useCreateProgram(departmentId ?? 0);
  const updateProgram = useUpdateProgram(editingProgram?.id ?? 0);

  const programs = useMemo(() => programsQuery.data ?? [], [programsQuery.data]);

  if (!departmentId) {
    return <EmptyState title="Invalid department" description="The requested department ID is invalid." />;
  }

  if (departmentQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (departmentQuery.isError || !departmentQuery.data) {
    return (
      <EmptyState
        title="Department not found"
        description="The department could not be loaded."
        action={{ label: 'Back to departments', onClick: () => window.history.back() }}
      />
    );
  }

  const department = departmentQuery.data;
  const stats = statsQuery.data;
  const statCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: 'Students', value: stats?.students ?? 0, icon: Users },
    { label: 'Teachers', value: stats?.teachers ?? 0, icon: Users },
    { label: 'Classes', value: stats?.classes ?? 0, icon: GraduationCap },
    { label: 'Societies', value: stats?.societies ?? 0, icon: BookOpen },
  ];

  async function handleUpdateDepartment(values: DepartmentFormValues) {
    await updateDepartment.mutateAsync(values);
  }

  async function handleCreateProgram(values: ProgramFormValues | UpdateProgramFormValues) {
    await createProgram.mutateAsync(values as ProgramFormValues);
  }

  async function handleUpdateProgram(values: ProgramFormValues | UpdateProgramFormValues) {
    if (!editingProgram) return;
    await updateProgram.mutateAsync(values as UpdateProgramFormValues);
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={department.name}
        description={`Department code ${department.code}. Linked server #${department.serverId}.`}
        actions={
          <>
            <Link to={ROUTES.ADMIN_DEPARTMENTS} className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft className="size-4" />
              Departments
            </Link>
            <Button type="button" variant="outline" onClick={() => setEditDepartmentOpen(true)}>
              <Edit className="size-4" />
              Edit
            </Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardHeader className="grid-cols-[1fr_auto] items-center">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="rounded-lg border bg-background p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">HOD</p>
            <p className="mt-1 text-sm font-medium">
              {department.hod?.user.fullName ?? 'Not assigned'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Programs</p>
            <p className="mt-1 text-sm font-medium">{department._count.programs}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Server ID</p>
            <p className="mt-1 text-sm font-medium">{department.serverId}</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Programs</h2>
          <Button type="button" onClick={() => setCreateProgramOpen(true)}>
            <Plus className="size-4" />
            Create program
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-background">
          <DataState
            isLoading={programsQuery.isLoading}
            isError={programsQuery.isError}
            onRetry={() => void programsQuery.refetch()}
            empty={programs.length === 0}
          >
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Discipline</th>
                  <th className="px-4 py-3 font-medium">Degree</th>
                  <th className="px-4 py-3 font-medium">Semesters</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {programs.map((program) => (
                  <tr key={program.id}>
                    <td className="px-4 py-3 font-medium">{program.code}</td>
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
          </DataState>
        </div>
      </div>
      <DepartmentDialog
        open={editDepartmentOpen}
        onOpenChange={setEditDepartmentOpen}
        initial={department}
        loading={updateDepartment.isPending}
        onSubmit={handleUpdateDepartment}
      />
      <ProgramDialog
        open={createProgramOpen}
        onOpenChange={setCreateProgramOpen}
        disciplines={disciplinesQuery.data ?? []}
        degreeLevels={degreeLevelsQuery.data ?? []}
        loading={createProgram.isPending}
        onSubmit={handleCreateProgram}
      />
      <ProgramDialog
        open={editingProgram !== null}
        onOpenChange={(open) => !open && setEditingProgram(null)}
        initial={editingProgram ?? undefined}
        disciplines={disciplinesQuery.data ?? []}
        degreeLevels={degreeLevelsQuery.data ?? []}
        loading={updateProgram.isPending}
        onSubmit={handleUpdateProgram}
      />
    </section>
  );
}
