import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { parsePositiveInt } from '../utils';
import { useDepartments } from '../hooks/useDepartments';
import { useAdminCourses, useCreateCourse, useUpdateCourse } from '../hooks/useAcademicCatalog';
import {
  AdminPageHeader,
  DataState,
  PaginationControls,
  inputClassName,
} from '../components/AdminDataPrimitives';
import { CourseDialog } from '../components/CatalogDialogs';
import type { CourseListItem } from '@/types';
import type { CourseFormValues, UpdateCourseFormValues } from '../schemas';

export function CourseListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CourseListItem | null>(null);
  const searchParamValue = searchParams.get('search') ?? '';
  const [searchValue, setSearchValue] = useState(searchParamValue);
  const debouncedSearch = useDebouncedValue(searchValue.trim(), 300);
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const departmentId = parsePositiveInt(searchParams.get('departmentId'));
  const search = searchParamValue.trim() || undefined;
  const coursesQuery = useAdminCourses({ page, limit: DEFAULT_PAGE_SIZE, departmentId, search });
  const departmentsQuery = useDepartments();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse(editing?.id ?? 0);
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const departmentById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );
  const courses = coursesQuery.data?.data ?? [];

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

  async function handleCreate(values: CourseFormValues | UpdateCourseFormValues) {
    await createCourse.mutateAsync(values as CourseFormValues);
  }

  async function handleUpdate(values: CourseFormValues | UpdateCourseFormValues) {
    if (!editing) return;
    await updateCourse.mutateAsync(values as UpdateCourseFormValues);
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Courses"
        description="Manage department-owned course catalog records used by curriculum and class assignments."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create course
          </Button>
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
          isLoading={coursesQuery.isLoading}
          isError={coursesQuery.isError}
          onRetry={() => void coursesQuery.refetch()}
          empty={courses.length === 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Credit hours</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td className="px-4 py-3 font-medium">{course.title}</td>
                    <td className="px-4 py-3">{course.code}</td>
                    <td className="px-4 py-3">{course.creditHours}</td>
                    <td className="px-4 py-3">
                      {departmentById.get(course.departmentId)?.code ?? course.departmentId}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditing(course)}>
                        <Edit className="size-4" />
                        <span className="sr-only">Edit course</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </div>
      <PaginationControls
        pagination={coursesQuery.data?.pagination}
        onPageChange={(nextPage) => updateFilter({ page: nextPage })}
      />
      <CourseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        departments={departments}
        loading={createCourse.isPending}
        onSubmit={handleCreate}
      />
      <CourseDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        initial={editing ?? undefined}
        departments={departments}
        loading={updateCourse.isPending}
        onSubmit={handleUpdate}
      />
    </section>
  );
}
