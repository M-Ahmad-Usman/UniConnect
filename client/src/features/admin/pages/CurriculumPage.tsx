import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ROUTES } from '@/lib/constants';
import { parsePositiveInt } from '../utils';
import {
  useAddCurriculum,
  useAdminCourses,
  useCurriculum,
  useProgram,
  useRemoveCurriculum,
} from '../hooks/useAcademicCatalog';
import { AdminPageHeader, DataState, inputClassName } from '../components/AdminDataPrimitives';
import { CurriculumDialog } from '../components/CatalogDialogs';
import type { CurriculumEntry } from '@/types';
import type { CurriculumFormValues } from '../schemas';

export function CurriculumPage() {
  const programId = parsePositiveInt(useParams().programId ?? null) ?? null;
  const [searchParams, setSearchParams] = useSearchParams();
  const batchYear = parsePositiveInt(searchParams.get('batchYear'));
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<CurriculumEntry | null>(null);
  const programQuery = useProgram(programId);
  const curriculumQuery = useCurriculum(programId, { batchYear });
  const addCurriculum = useAddCurriculum(programId ?? 0);
  const removeCurriculum = useRemoveCurriculum(programId ?? 0);
  const departmentId = programQuery.data?.departmentId;
  const coursesQuery = useAdminCourses({ page: 1, limit: 50, departmentId });
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
    await addCurriculum.mutateAsync(values);
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={`${program.code} curriculum`}
        description={`${program.department.code} · ${program.discipline.name} · ${program.degreeLevel.level}`}
        actions={
          <>
            <Link to={ROUTES.ADMIN_PROGRAMS} className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft className="size-4" />
              Programs
            </Link>
            <Button type="button" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add course
            </Button>
          </>
        }
      />
      <div className="rounded-lg border bg-background p-3">
        <label className="block max-w-xs space-y-1.5">
          <span className="text-sm font-medium">Batch year</span>
          <input
            className={inputClassName}
            type="number"
            value={batchYear ?? ''}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value) next.set('batchYear', event.target.value);
              else next.delete('batchYear');
              setSearchParams(next);
            }}
          />
        </label>
      </div>
      <DataState
        isLoading={curriculumQuery.isLoading}
        isError={curriculumQuery.isError}
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
                      <th className="px-4 py-3 font-medium">Batch</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 font-medium">{entry.course.title}</td>
                        <td className="px-4 py-3">{entry.course.code}</td>
                        <td className="px-4 py-3">{entry.course.creditHours}</td>
                        <td className="px-4 py-3">{entry.batchYear}</td>
                        <td className="px-4 py-3 text-right">
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setRemoving(entry)}>
                            <Trash2 className="size-4" />
                            <span className="sr-only">Remove curriculum entry</span>
                          </Button>
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
        onOpenChange={setAddOpen}
        courses={coursesQuery.data?.data ?? []}
        defaultBatchYear={batchYear ?? new Date().getFullYear()}
        maxSemester={program.semesters}
        loading={addCurriculum.isPending}
        onSubmit={handleAdd}
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
