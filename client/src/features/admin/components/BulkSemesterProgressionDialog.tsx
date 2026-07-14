import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { catalogApi, type BulkSemesterProgressionResult } from '@/api/endpoints/catalog.api';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ClassListItem, TeacherAssignmentInput } from '@/types';
import { inputClassName } from './AdminDataPrimitives';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassListItem[];
  loading: boolean;
  result: BulkSemesterProgressionResult | null;
  onSubmit: (
    classes: Array<{ classPublicId: string; teacherAssignments: TeacherAssignmentInput[] }>,
  ) => Promise<void>;
}

export function BulkSemesterProgressionDialog({
  open,
  onOpenChange,
  classes,
  loading,
  result,
  onSubmit,
}: Props) {
  const [assignments, setAssignments] = useState<Record<string, Record<number, string>>>({});
  const curriculumQueries = useQueries({
    queries: classes.map((klass) => ({
      queryKey: ['bulk-progression', klass.publicId, 'curriculum'],
      queryFn: () =>
        catalogApi.listCurriculum(klass.program.id, {
          semesterNumber: klass.currentSemester + 1,
          batchYear: klass.admissionYear,
        }),
      enabled: open && !result,
    })),
  });
  const teacherQueries = useQueries({
    queries: classes.map((klass) => ({
      queryKey: ['bulk-progression', klass.publicId, 'teachers'],
      queryFn: () => catalogApi.listTeacherCandidates(klass.publicId, { page: 1, limit: 50 }),
      enabled: open && !result,
    })),
  });
  const ready =
    curriculumQueries.every((query) => query.isSuccess) &&
    teacherQueries.every((query) => query.isSuccess);
  const hasError =
    curriculumQueries.some((query) => query.isError) ||
    teacherQueries.some((query) => query.isError);
  const payload = useMemo(
    () =>
      classes.map((klass, index) => ({
        classPublicId: klass.publicId,
        teacherAssignments: (curriculumQueries[index]?.data ?? []).flatMap((entry) => {
          const teacherPublicId = assignments[klass.publicId]?.[entry.course.id];
          return teacherPublicId ? [{ courseId: entry.course.id, teacherPublicId }] : [];
        }),
      })),
    [assignments, classes, curriculumQueries],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk semester progression</DialogTitle>
          <DialogDescription>
            Each class is processed independently. A failure will not roll back successful classes.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            <p className="text-sm font-medium">
              {result.succeeded} succeeded, {result.failed} failed
            </p>
            {result.results.map((item) => (
              <div
                key={item.classPublicId}
                className="flex items-start justify-between gap-3 border-b py-3"
              >
                <span className="text-sm">
                  {classes.find((klass) => klass.publicId === item.classPublicId)?.program.code ??
                    item.classPublicId}
                </span>
                {item.status === 'SUCCESS' ? (
                  <Badge variant="secondary">
                    <CheckCircle2 /> Advanced
                  </Badge>
                ) : (
                  <div className="text-right">
                    <Badge variant="destructive">
                      <XCircle /> Failed
                    </Badge>
                    <p className="text-muted-foreground mt-1 text-xs">{item.error.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !ready ? (
          hasError ? (
            <p className="text-destructive text-sm">
              Some class progression data could not be loaded.
            </p>
          ) : (
            <LoadingSpinner />
          )
        ) : (
          <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
            {classes.map((klass, index) => {
              const curriculum = curriculumQueries[index]?.data ?? [];
              const teachers = teacherQueries[index]?.data?.data ?? [];
              return (
                <section key={klass.publicId} className="space-y-2 border-b pb-4 last:border-b-0">
                  <h3 className="text-sm font-semibold">
                    {klass.program.code}, semester {klass.currentSemester + 1}, section{' '}
                    {klass.section}
                  </h3>
                  {curriculum.map((entry) => (
                    <label
                      key={entry.id}
                      className="grid gap-2 sm:grid-cols-[1fr_18rem] sm:items-center"
                    >
                      <span className="text-sm">
                        {entry.course.code}: {entry.course.title}
                      </span>
                      <select
                        className={inputClassName}
                        value={assignments[klass.publicId]?.[entry.course.id] ?? ''}
                        onChange={(event) =>
                          setAssignments((current) => ({
                            ...current,
                            [klass.publicId]: {
                              ...current[klass.publicId],
                              [entry.course.id]: event.target.value,
                            },
                          }))
                        }
                      >
                        <option value="">No teacher</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.teacherPublicId} value={teacher.teacherPublicId}>
                            {teacher.user.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </section>
              );
            })}
          </div>
        )}
        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          ) : (
            <Button disabled={!ready || loading} onClick={() => void onSubmit(payload)}>
              Advance {classes.length} classes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
