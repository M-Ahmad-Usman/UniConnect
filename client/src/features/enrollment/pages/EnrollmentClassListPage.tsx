import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Eye, Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AdminPageHeader,
  DataState,
  FormField,
  PaginationControls,
  TableSurface,
  inputClassName,
} from '@/features/admin/components/AdminDataPrimitives';
import { DEFAULT_PAGE_SIZE, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { parsePositiveInt } from '@/features/admin/utils';
import { ClassStatus, type Section } from '@/types';
import {
  useCreateEnrollmentClass,
  useEnrollmentBootstrap,
  useEnrollmentClasses,
  useEnrollmentPrograms,
} from '../hooks/useEnrollment';
import {
  enrollmentClassSchema,
  type EnrollmentClassFormInput,
  type EnrollmentClassFormValues,
} from '../schemas';

function parseSection(value: string | null): Section | undefined {
  return value === 'A' || value === 'B' ? value : undefined;
}

function parseStatus(value: string | null): ClassStatus | 'ALL' | undefined {
  if (value === ClassStatus.ACTIVE || value === ClassStatus.GRADUATED || value === 'ALL') {
    return value;
  }
  return undefined;
}

export function EnrollmentClassListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const departmentId = parsePositiveInt(searchParams.get('departmentId'));
  const programId = parsePositiveInt(searchParams.get('programId'));
  const semester = parsePositiveInt(searchParams.get('semester'));
  const section = parseSection(searchParams.get('section'));
  const status = parseStatus(searchParams.get('status'));
  const bootstrapQuery = useEnrollmentBootstrap();
  const departments = useMemo(() => bootstrapQuery.data?.departments ?? [], [bootstrapQuery.data?.departments]);
  const effectiveDepartmentId = departmentId ?? bootstrapQuery.data?.defaultDepartmentId ?? undefined;
  const programsQuery = useEnrollmentPrograms(
    { page: 1, limit: 100, departmentId: effectiveDepartmentId },
    bootstrapQuery.isSuccess && effectiveDepartmentId !== undefined,
  );
  const classesQuery = useEnrollmentClasses(
    { page, limit: DEFAULT_PAGE_SIZE, departmentId: effectiveDepartmentId, programId, semester, section, status },
    bootstrapQuery.isSuccess,
  );
  const createClass = useCreateEnrollmentClass();
  const programs = programsQuery.data?.data ?? [];
  const classes = classesQuery.data?.data ?? [];

  const selectedDepartment = useMemo(
    () => departments.find((department) => department.id === effectiveDepartmentId),
    [departments, effectiveDepartmentId],
  );

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
    if ('departmentId' in updates) next.delete('programId');
    next.set('page', String(updates.page ?? 1));
    setSearchParams(next);
  }

  async function handleCreate(values: EnrollmentClassFormValues) {
    await createClass.mutateAsync(values);
    setCreateOpen(false);
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        eyebrow="Enrollment"
        title="Classes"
        description="Create class cohorts and manage student placement."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create class
          </Button>
        }
      />

      <div className="rounded-lg border bg-background p-3">
        <div className="grid gap-3 lg:grid-cols-5">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Department</span>
            <select
              className={inputClassName}
              value={effectiveDepartmentId ?? ''}
              onChange={(event) => updateFilter({ departmentId: event.target.value })}
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Program</span>
            <select
              className={inputClassName}
              value={programId ?? ''}
              onChange={(event) => updateFilter({ programId: event.target.value })}
            >
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
            <input
              className={inputClassName}
              inputMode="numeric"
              value={semester ?? ''}
              onChange={(event) => updateFilter({ semester: event.target.value })}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Section</span>
            <select
              className={inputClassName}
              value={section ?? ''}
              onChange={(event) => updateFilter({ section: event.target.value })}
            >
              <option value="">All</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Status</span>
            <select
              className={inputClassName}
              value={status ?? ''}
              onChange={(event) => updateFilter({ status: event.target.value })}
            >
              <option value="">Active</option>
              <option value="ALL">All</option>
              <option value={ClassStatus.GRADUATED}>Graduated</option>
            </select>
          </label>
        </div>
      </div>

      <DataState
        isLoading={classesQuery.isLoading || bootstrapQuery.isLoading}
        isError={classesQuery.isError || bootstrapQuery.isError}
        error={classesQuery.error ?? bootstrapQuery.error}
        onRetry={() => {
          void bootstrapQuery.refetch();
          void classesQuery.refetch();
        }}
        empty={classes.length === 0}
        emptyTitle="No classes found"
        emptyDescription="Create a class after the program curriculum is ready."
      >
        <TableSurface title="Enrollment classes">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Academic year</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {classes.map((klass) => (
              <tr key={klass.publicId}>
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {klass.program.code} · S{klass.currentSemester} · {klass.section}
                  </p>
                  <p className="text-xs text-muted-foreground">Admission {klass.admissionYear}</p>
                </td>
                <td className="px-4 py-3">{klass.program.department.code}</td>
                <td className="px-4 py-3">{klass.academicYear}</td>
                <td className="px-4 py-3">{klass.status}</td>
                <td className="px-4 py-3">
                  <Link
                    to={ROUTES.ENROLLMENT_CLASS(klass.publicId)}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    <Eye className="size-4" />
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </TableSurface>
      </DataState>

      <PaginationControls
        pagination={classesQuery.data?.pagination}
        onPageChange={(nextPage) => updateFilter({ page: nextPage })}
      />

      {createOpen ? (
        <CreateClassPanel
          departments={departments}
          programs={programs}
          selectedDepartmentLabel={selectedDepartment?.code ?? ''}
          isPending={createClass.isPending}
          onCancel={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      ) : null}
    </section>
  );
}

function CreateClassPanel({
  departments,
  programs,
  selectedDepartmentLabel,
  isPending,
  onCancel,
  onSubmit,
}: {
  departments: Array<{ id: number; code: string; name: string }>;
  programs: Array<{ id: number; code: string }>;
  selectedDepartmentLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (values: EnrollmentClassFormValues) => Promise<void>;
}) {
  const form = useForm<EnrollmentClassFormInput, unknown, EnrollmentClassFormValues>({
    resolver: zodResolver(enrollmentClassSchema),
    defaultValues: {
      programId: programs[0]?.id ?? 0,
      currentSemester: 1,
      academicYear: new Date().getFullYear(),
      admissionYear: new Date().getFullYear(),
      section: 'A',
    },
  });

  return (
    <form
      className="space-y-4 rounded-lg border bg-card p-4"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <div className="grid gap-3 md:grid-cols-3">
        <FormField label="Department">
          <input className={inputClassName} value={selectedDepartmentLabel || departments[0]?.code || ''} readOnly />
        </FormField>
        <FormField label="Program" error={form.formState.errors.programId?.message}>
          <select className={inputClassName} disabled={isPending} {...form.register('programId')}>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.code}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Section" error={form.formState.errors.section?.message}>
          <select className={inputClassName} disabled={isPending} {...form.register('section')}>
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </FormField>
        <FormField label="Current semester" error={form.formState.errors.currentSemester?.message}>
          <input className={inputClassName} disabled={isPending} {...form.register('currentSemester')} />
        </FormField>
        <FormField label="Academic year" error={form.formState.errors.academicYear?.message}>
          <input className={inputClassName} disabled={isPending} {...form.register('academicYear')} />
        </FormField>
        <FormField label="Admission year" error={form.formState.errors.admissionYear?.message}>
          <input className={inputClassName} disabled={isPending} {...form.register('admissionYear')} />
        </FormField>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || programs.length === 0}>
          Create
        </Button>
      </div>
    </form>
  );
}
