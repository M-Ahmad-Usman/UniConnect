import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Lock, Plus, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ROUTES } from '@/lib/constants';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { parsePositiveInt } from '../utils';
import {
  useAdminCourses,
  useBulkAddCurriculum,
  useCopyCurriculumBatch,
  useCurriculum,
  useProgram,
  useRemoveCurriculum,
} from '../hooks/useAcademicCatalog';
import { AdminPageHeader, DataState } from '../components/AdminDataPrimitives';
import { CopyCurriculumBatchDialog, CurriculumDialog } from '../components/CatalogDialogs';
import type { CurriculumEntry } from '@/types';
import type { CopyCurriculumBatchFormValues, CurriculumFormValues } from '../schemas';

const RECENT_BATCH_COUNT = 5;
const OLDER_BATCH_PAGE_SIZE = 5;
const MIN_BATCH_YEAR = 2000;

export function CurriculumPage() {
  const programId = parsePositiveInt(useParams().programId ?? null) ?? null;
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const parsedBatchYear = parsePositiveInt(searchParams.get('batchYear'));
  const selectedBatchYear =
    parsedBatchYear && parsedBatchYear >= MIN_BATCH_YEAR && parsedBatchYear <= currentYear
      ? parsedBatchYear
      : currentYear;
  const recentBatchYears = useMemo(
    () => Array.from({ length: RECENT_BATCH_COUNT }, (_, index) => currentYear - index),
    [currentYear],
  );
  const olderBatchYears = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, currentYear - RECENT_BATCH_COUNT - MIN_BATCH_YEAR + 1) },
        (_, index) => currentYear - RECENT_BATCH_COUNT - index,
      ),
    [currentYear],
  );
  const [olderOpen, setOlderOpen] = useState(
    selectedBatchYear < currentYear - RECENT_BATCH_COUNT + 1,
  );
  const [olderPage, setOlderPage] = useState(() => {
    const olderIndex = olderBatchYears.indexOf(selectedBatchYear);
    return olderIndex >= 0 ? Math.floor(olderIndex / OLDER_BATCH_PAGE_SIZE) + 1 : 1;
  });
  const [addOpen, setAddOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const deferredCourseSearch = useDeferredValue(courseSearch);
  const [removing, setRemoving] = useState<CurriculumEntry | null>(null);
  const permissionsQuery = useMyPermissions();
  const programQuery = useProgram(programId);
  const curriculumQuery = useCurriculum(programId, { batchYear: selectedBatchYear });
  const bulkAddCurriculum = useBulkAddCurriculum(programId ?? 0);
  const copyCurriculumBatch = useCopyCurriculumBatch(programId ?? 0);
  const removeCurriculum = useRemoveCurriculum(programId ?? 0);
  const departmentId = programQuery.data?.departmentId;
  const permissionData = permissionsQuery.data;
  const canManageCurriculum = Boolean(
    permissionData?.global.canAccessAdminDashboard ||
      (departmentId !== undefined &&
        permissionData?.scopes.hodDepartmentIds.includes(departmentId)) ||
      (programId !== null && permissionData?.scopes.directedProgramIds.includes(programId)),
  );
  const coursesQuery = useAdminCourses(
    {
      page: 1,
      limit: 50,
      departmentId,
      search: deferredCourseSearch.trim() || undefined,
    },
    canManageCurriculum && departmentId !== undefined,
  );
  const olderTotalPages = Math.max(1, Math.ceil(olderBatchYears.length / OLDER_BATCH_PAGE_SIZE));
  const olderPageYears = olderBatchYears.slice(
    (olderPage - 1) * OLDER_BATCH_PAGE_SIZE,
    olderPage * OLDER_BATCH_PAGE_SIZE,
  );
  const curriculum = useMemo(() => curriculumQuery.data ?? [], [curriculumQuery.data]);

  const grouped = useMemo(() => {
    const groups = new Map<number, CurriculumEntry[]>();
    for (const entry of curriculum) {
      groups.set(entry.semesterNumber, [...(groups.get(entry.semesterNumber) ?? []), entry]);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [curriculum]);

  if (!programId) {
    return <EmptyState title="Invalid program" description="The requested program ID is invalid." />;
  }

  if (programQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (programQuery.isError || !programQuery.data) {
    return <EmptyState title="Program not found" description="The program could not be loaded." />;
  }

  const program = programQuery.data;

  async function handleAdd(values: CurriculumFormValues) {
    await bulkAddCurriculum.mutateAsync(values);
  }

  async function handleCopy(values: CopyCurriculumBatchFormValues) {
    await copyCurriculumBatch.mutateAsync(values);
  }

  function handleAddOpenChange(open: boolean) {
    setAddOpen(open);
    if (!open) setCourseSearch('');
  }

  function selectBatchYear(year: number) {
    const next = new URLSearchParams(searchParams);
    next.set('batchYear', String(year));
    setSearchParams(next);
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={`${program.code} curriculum`}
        description={`${program.department.code} · ${program.discipline.name} · ${program.degreeLevel.level}`}
        actions={
          <>
            <Link to={ROUTES.ACADEMICS_PROGRAMS} className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft className="size-4" />
              Programs
            </Link>
            {canManageCurriculum ? (
              <>
                <Button type="button" variant="outline" onClick={() => setCopyOpen(true)}>
                  <Copy className="size-4" />
                  Copy batch
                </Button>
                <Button type="button" onClick={() => setAddOpen(true)}>
                  <Plus className="size-4" />
                  Add courses
                </Button>
              </>
            ) : null}
          </>
        }
      />
      <div className="space-y-3 rounded-lg border bg-background p-3">
        <div className="flex flex-wrap gap-2">
          {recentBatchYears.map((year) => (
            <Button
              key={year}
              type="button"
              variant={selectedBatchYear === year ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectBatchYear(year)}
            >
              {year}
            </Button>
          ))}
          {olderBatchYears.length > 0 ? (
            <Button
              type="button"
              variant={olderOpen ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setOlderOpen((open) => !open)}
            >
              Older batches
            </Button>
          ) : null}
        </div>
        {olderOpen ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div className="flex flex-wrap gap-2">
              {olderPageYears.map((year) => (
                <Button
                  key={year}
                  type="button"
                  variant={selectedBatchYear === year ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => selectBatchYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={olderPage <= 1}
                onClick={() => setOlderPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {olderPage} of {olderTotalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={olderPage >= olderTotalPages}
                onClick={() => setOlderPage((page) => Math.min(olderTotalPages, page + 1))}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <DataState
        isLoading={curriculumQuery.isLoading}
        isError={curriculumQuery.isError}
        error={curriculumQuery.error}
        onRetry={() => void curriculumQuery.refetch()}
        empty={curriculum.length === 0}
      >
        <div className="space-y-4">
          {grouped.map(([semesterNumber, entries]) => (
            <div key={semesterNumber} className="overflow-hidden rounded-lg border bg-background">
              <div className="border-b bg-muted/40 px-4 py-3">
                <h2 className="font-semibold">Semester {semesterNumber}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Course</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Credits</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 font-medium">{entry.course.title}</td>
                        <td className="px-4 py-3">{entry.course.code}</td>
                        <td className="px-4 py-3">{entry.course.creditHours}</td>
                        <td className="px-4 py-3 text-right">
                          {canManageCurriculum && entry.isLocked ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <Lock className="size-3.5" />
                              Locked
                            </span>
                          ) : null}
                          {canManageCurriculum && !entry.isLocked ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setRemoving(entry)}
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">Remove curriculum entry</span>
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </DataState>
      <CurriculumDialog
        open={addOpen}
        onOpenChange={handleAddOpenChange}
        courses={coursesQuery.data?.data ?? []}
        coursesLoading={coursesQuery.isFetching}
        courseSearch={courseSearch}
        onCourseSearchChange={setCourseSearch}
        defaultBatchYear={selectedBatchYear}
        maxSemester={program.semesters}
        loading={bulkAddCurriculum.isPending}
        onSubmit={handleAdd}
      />
      <CopyCurriculumBatchDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        defaultSourceBatchYear={selectedBatchYear - 1}
        defaultTargetBatchYear={selectedBatchYear}
        loading={copyCurriculumBatch.isPending}
        onSubmit={handleCopy}
      />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove curriculum entry"
        description="This removes the course from this program curriculum. Existing class assignments are not changed."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={async () => {
          if (!removing) return;
          await removeCurriculum.mutateAsync(removing.id);
        }}
      />
    </section>
  );
}
