import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Wand2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ROUTES } from '@/lib/constants';
import { UserType, type CourseListItem, type TeacherAssignmentInput } from '@/types';
import { parsePositiveInt } from '../utils';
import { useAdminUsers } from '../hooks/useAdminUsers';
import {
  useAdminClass,
  useAdminClassCourses,
  useAssignClassCourse,
  useAdvanceSemester,
  useCurriculum,
  useRemoveClassCourse,
} from '../hooks/useAcademicCatalog';
import { AdminPageHeader, DataState, inputClassName } from '../components/AdminDataPrimitives';
import { AssignCourseDialog } from '../components/CatalogDialogs';

export function ClassDetailPage() {
  const classId = parsePositiveInt(useParams().classId ?? null) ?? null;
  const [assignOpen, setAssignOpen] = useState(false);
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [removingCourseId, setRemovingCourseId] = useState<number | null>(null);
  const [teacherByCourse, setTeacherByCourse] = useState<Record<number, number>>({});

  const classQuery = useAdminClass(classId);
  const coursesQuery = useAdminClassCourses(classId);
  const assignCourse = useAssignClassCourse(classId ?? 0);
  const removeCourse = useRemoveClassCourse(classId ?? 0);
  const advanceSemester = useAdvanceSemester(classId ?? 0);

  const klass = classQuery.data;
  const departmentId = klass?.program.department.id;
  const currentCurriculumQuery = useCurriculum(
    klass?.program.id ?? null,
    klass ? { semesterNumber: klass.currentSemester, batchYear: klass.admissionYear } : {},
  );
  const nextCurriculumQuery = useCurriculum(
    klass?.program.id ?? null,
    klass
      ? { semesterNumber: klass.currentSemester + 1, batchYear: klass.admissionYear }
      : {},
  );
  const teachersQuery = useAdminUsers({
    page: 1,
    limit: 50,
    userType: UserType.TEACHER,
    departmentId,
    isActive: true,
  });

  const curriculumCourses: CourseListItem[] = useMemo(
    () =>
      (currentCurriculumQuery.data ?? []).map((entry) => ({
        ...entry.course,
        departmentId: departmentId ?? 0,
      })),
    [currentCurriculumQuery.data, departmentId],
  );
  const nextCurriculum = nextCurriculumQuery.data ?? [];
  const teachers = useMemo(() => teachersQuery.data?.data ?? [], [teachersQuery.data]);
  const assignments = coursesQuery.data ?? [];
  const validTeacherIds = useMemo(() => new Set(teachers.map((teacher) => teacher.id)), [teachers]);

  if (!classId) {
    return <EmptyState title="Invalid class" description="The requested class ID is invalid." />;
  }

  if (classQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (classQuery.isError || !klass) {
    return <EmptyState title="Class not found" description="The class could not be loaded." />;
  }

  async function handleAssign(values: { courseId: number; teacherId: number }) {
    await assignCourse.mutateAsync(values);
  }

  async function handleAdvance() {
    if (!canProgress) {
      return;
    }

    const teacherAssignments: TeacherAssignmentInput[] = nextCurriculum.map((entry) => ({
      courseId: entry.course.id,
      teacherId: teacherByCourse[entry.course.id]!,
    }));
    await advanceSemester.mutateAsync(teacherAssignments);
    setProgressionOpen(false);
    setTeacherByCourse({});
  }

  const canProgress =
    !nextCurriculumQuery.isLoading &&
    !nextCurriculumQuery.isError &&
    (nextCurriculum.length === 0 ||
      nextCurriculum.every((entry) => {
        const teacherId = teacherByCourse[entry.course.id];
        return typeof teacherId === 'number' && teacherId > 0 && validTeacherIds.has(teacherId);
      }));

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={`${klass.program.code} · Semester ${klass.currentSemester}${klass.section}`}
        description={`${klass.program.department.name} · Admission ${klass.admissionYear} · Server #${klass.serverId}`}
        actions={
          <>
            <Link to={ROUTES.ADMIN_CLASSES} className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft className="size-4" />
              Classes
            </Link>
            <Button type="button" onClick={() => setAssignOpen(true)}>
              <Plus className="size-4" />
              Assign course
            </Button>
          </>
        }
      />
      <div className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-4">
        <Info label="Program" value={klass.program.code} />
        <Info label="Current semester" value={klass.currentSemester} />
        <Info label="Students" value={klass._count.students} />
        <Info label="CR" value={klass.cr?.user.fullName ?? 'Not assigned'} />
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Assigned courses</h2>
          <Button type="button" variant="outline" onClick={() => setProgressionOpen(true)}>
            <Wand2 className="size-4" />
            Semester progression
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-background">
          <DataState
            isLoading={coursesQuery.isLoading}
            isError={coursesQuery.isError}
            onRetry={() => void coursesQuery.refetch()}
            empty={assignments.length === 0}
          >
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Teacher</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assignments.map((assignment) => (
                  <tr key={`${assignment.courseId}-${assignment.teacherId}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{assignment.course.code}</p>
                      <p className="text-xs text-muted-foreground">{assignment.course.title}</p>
                    </td>
                    <td className="px-4 py-3">{assignment.teacher.user.fullName}</td>
                    <td className="px-4 py-3">{assignment.course.creditHours}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRemovingCourseId(assignment.courseId)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Remove course assignment</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataState>
        </div>
      </div>
      <AssignCourseDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        courses={curriculumCourses}
        teachers={teachers}
        loading={assignCourse.isPending}
        onSubmit={handleAssign}
      />
      <ConfirmDialog
        open={removingCourseId !== null}
        onOpenChange={(open) => !open && setRemovingCourseId(null)}
        title="Remove course assignment"
        description="This removes the teacher assignment and archives the auto-created course channel."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={async () => {
          if (removingCourseId === null) return;
          await removeCourse.mutateAsync(removingCourseId);
        }}
      />
      <Dialog open={progressionOpen} onOpenChange={setProgressionOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Advance semester</DialogTitle>
            <DialogDescription>
              Existing course channels will be archived and current teacher assignments cleared.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {nextCurriculumQuery.isLoading ? <LoadingSpinner /> : null}
            {!nextCurriculumQuery.isLoading && nextCurriculum.length === 0 ? (
              <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                No curriculum exists for semester {klass.currentSemester + 1}. Progression will advance the class without creating course assignments.
              </p>
            ) : null}
            {nextCurriculum.map((entry) => (
              <label key={entry.id} className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_18rem] sm:items-center">
                <span>
                  <span className="block font-medium">{entry.course.code}</span>
                  <span className="text-sm text-muted-foreground">{entry.course.title}</span>
                </span>
                <select
                  className={inputClassName}
                  value={teacherByCourse[entry.course.id] ?? ''}
                  onChange={(event) => {
                    const selectedTeacherId = parsePositiveInt(event.target.value);
                    setTeacherByCourse((current) => {
                      const next = { ...current };
                      if (selectedTeacherId) {
                        next[entry.course.id] = selectedTeacherId;
                      } else {
                        delete next[entry.course.id];
                      }
                      return next;
                    });
                  }}
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" disabled={!canProgress || advanceSemester.isPending} onClick={() => void handleAdvance()}>
              <Wand2 className="size-4" />
              Advance to semester {klass.currentSemester + 1}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
