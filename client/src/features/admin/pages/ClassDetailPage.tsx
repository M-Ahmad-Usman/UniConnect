import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  Plus,
  RefreshCw,
  Trash2,
  UserRoundPlus,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import type { ClassCourseAssignment, CourseListItem, TeacherAssignmentInput } from '@/types';
import { getClassDetailActionState, parsePositiveInt } from '../utils';
import {
  useAdminClass,
  useAdminClassCourses,
  useAssignClassCourse,
  useAdvanceSemester,
  useClassStudents,
  useCurriculum,
  useGraduateClass,
  useRemoveClassCourse,
  useReplaceCourseTeacher,
  useStudentCandidates,
  useTeacherCandidates,
  useTransferClassStudent,
} from '../hooks/useAcademicCatalog';
import {
  AdminPageHeader,
  DataState,
  TableSurface,
  inputClassName,
} from '../components/AdminDataPrimitives';
import { AssignCourseDialog } from '../components/CatalogDialogs';
import {
  replaceTeacherSchema,
  transferStudentSchema,
  type ReplaceTeacherFormValues,
  type TransferStudentFormValues,
} from '../schemas';

export function ClassDetailPage() {
  const classId = parsePositiveInt(useParams().classId ?? null) ?? null;
  const [assignOpen, setAssignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [graduationOpen, setGraduationOpen] = useState(false);
  const [removingCourseId, setRemovingCourseId] = useState<number | null>(null);
  const [replacingAssignment, setReplacingAssignment] = useState<ClassCourseAssignment | null>(
    null,
  );
  const [teacherByCourse, setTeacherByCourse] = useState<Record<number, number>>({});

  const classQuery = useAdminClass(classId);
  const klass = classQuery.data;
  const {
    isGraduated,
    canViewStudents,
    canManageStudents,
    canAssignCourses,
    canReplaceCourseTeacher,
    canRemoveCourses,
    canAdvanceSemester,
    canGraduate,
  } = getClassDetailActionState(klass);

  const coursesQuery = useAdminClassCourses(classId);
  const studentsQuery = useClassStudents(classId, { page: 1, limit: 50 }, canViewStudents);
  const studentCandidatesQuery = useStudentCandidates(
    classId,
    { page: 1, limit: 50 },
    transferOpen && canManageStudents,
  );
  const teacherCandidatesQuery = useTeacherCandidates(
    classId,
    { page: 1, limit: 50 },
    canAssignCourses || canReplaceCourseTeacher || canAdvanceSemester,
  );
  const assignCourse = useAssignClassCourse(classId ?? 0);
  const transferStudent = useTransferClassStudent(classId ?? 0);
  const replaceTeacher = useReplaceCourseTeacher(classId ?? 0);
  const removeCourse = useRemoveClassCourse(classId ?? 0);
  const advanceSemester = useAdvanceSemester(classId ?? 0);
  const graduateClass = useGraduateClass(classId ?? 0);

  const departmentId = klass?.program.department.id;
  const currentCurriculumQuery = useCurriculum(
    klass?.program.id ?? null,
    klass ? { semesterNumber: klass.currentSemester, batchYear: klass.admissionYear } : {},
  );
  const nextCurriculumQuery = useCurriculum(
    canAdvanceSemester && klass ? klass.program.id : null,
    klass ? { semesterNumber: klass.currentSemester + 1, batchYear: klass.admissionYear } : {},
  );

  const curriculumCourses: CourseListItem[] = useMemo(
    () =>
      (currentCurriculumQuery.data ?? []).map((entry) => ({
        ...entry.course,
        departmentId: departmentId ?? 0,
      })),
    [currentCurriculumQuery.data, departmentId],
  );
  const teacherOptions = useMemo(
    () =>
      (teacherCandidatesQuery.data?.data ?? []).map((teacher) => ({
        id: teacher.user.id,
        fullName: teacher.user.fullName,
        email: teacher.user.email,
      })),
    [teacherCandidatesQuery.data],
  );
  const validTeacherIds = useMemo(
    () => new Set(teacherOptions.map((teacher) => teacher.id)),
    [teacherOptions],
  );
  const assignments = coursesQuery.data ?? [];
  const students = studentsQuery.data?.data ?? [];
  const studentCandidates = studentCandidatesQuery.data?.data ?? [];
  const nextCurriculum = nextCurriculumQuery.data ?? [];

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
    if (!canProgress) return;

    const teacherAssignments: TeacherAssignmentInput[] = nextCurriculum.map((entry) => ({
      courseId: entry.course.id,
      teacherId: teacherByCourse[entry.course.id]!,
    }));
    await advanceSemester.mutateAsync(teacherAssignments);
    setProgressionOpen(false);
    setTeacherByCourse({});
  }

  const canProgress =
    canAdvanceSemester &&
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
            <Link to={ROUTES.ACADEMICS_CLASSES} className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft className="size-4" />
              Classes
            </Link>
            {canAssignCourses ? (
              <Button type="button" onClick={() => setAssignOpen(true)}>
                <Plus className="size-4" />
                Assign course
              </Button>
            ) : null}
            {canManageStudents ? (
              <Button type="button" variant="outline" onClick={() => setTransferOpen(true)}>
                <UserRoundPlus className="size-4" />
                Transfer student
              </Button>
            ) : null}
            {canGraduate ? (
              <Button type="button" variant="outline" onClick={() => setGraduationOpen(true)}>
                <GraduationCap className="size-4" />
                Graduate
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-5">
        <Info label="Program" value={klass.program.code} />
        <Info label="Current semester" value={klass.currentSemester} />
        <Info label="Students" value={klass._count.students} />
        <Info label="CR" value={klass.cr?.user.fullName ?? 'Not assigned'} />
        <div>
          <p className="text-xs uppercase text-muted-foreground">Status</p>
          <Badge variant={isGraduated ? 'secondary' : 'outline'} className="mt-1">
            {isGraduated ? 'Graduated' : 'Active'}
          </Badge>
        </div>
      </div>

      {isGraduated ? (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          This class is graduated. Academic mutations are disabled and class channels are read-only.
        </div>
      ) : null}

      {canViewStudents ? (
        <ClassStudentsSection
          isLoading={studentsQuery.isLoading}
          isError={studentsQuery.isError}
          students={students}
          onRetry={() => void studentsQuery.refetch()}
        />
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Assigned courses</h2>
          {canAdvanceSemester ? (
            <Button type="button" variant="outline" onClick={() => setProgressionOpen(true)}>
              <Wand2 className="size-4" />
              Semester progression
            </Button>
          ) : null}
        </div>
        <DataState
          isLoading={coursesQuery.isLoading}
          isError={coursesQuery.isError}
          onRetry={() => void coursesQuery.refetch()}
          empty={assignments.length === 0}
          emptyTitle="No assigned courses"
          emptyDescription="Assigned courses and teachers will appear here."
        >
          <TableSurface
            title="Assigned class courses"
            description="Course, teacher, credit hours, and available assignment actions."
            tableClassName="min-w-205"
          >
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
                    <div className="inline-flex gap-1">
                      {canReplaceCourseTeacher ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setReplacingAssignment(assignment)}
                        >
                          <RefreshCw className="size-4" />
                          <span className="sr-only">Replace teacher</span>
                        </Button>
                      ) : null}
                      {canRemoveCourses ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setRemovingCourseId(assignment.courseId)}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Remove course assignment</span>
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableSurface>
        </DataState>
      </div>

      <AssignCourseDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        courses={curriculumCourses}
        teachers={teacherOptions}
        loading={assignCourse.isPending}
        onSubmit={handleAssign}
      />
      <TransferStudentDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        candidates={studentCandidates}
        loading={transferStudent.isPending || studentCandidatesQuery.isLoading}
        onSubmit={async (values) => {
          await transferStudent.mutateAsync(values.studentId);
        }}
      />
      <ReplaceTeacherDialog
        open={replacingAssignment !== null}
        onOpenChange={(open) => !open && setReplacingAssignment(null)}
        assignment={replacingAssignment}
        teachers={teacherOptions}
        loading={replaceTeacher.isPending}
        onSubmit={async (values) => {
          if (!replacingAssignment) return;
          await replaceTeacher.mutateAsync({
            courseId: replacingAssignment.courseId,
            teacherId: values.teacherId,
          });
          setReplacingAssignment(null);
        }}
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
      <ConfirmDialog
        open={graduationOpen}
        onOpenChange={setGraduationOpen}
        title="Graduate class"
        description="This marks the class as graduated and locks all class channels so history stays readable."
        confirmLabel="Graduate"
        onConfirm={async () => {
          await graduateClass.mutateAsync();
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
                No curriculum exists for semester {klass.currentSemester + 1}. Progression will
                advance the class without creating course assignments.
              </p>
            ) : null}
            {nextCurriculum.map((entry) => (
              <label
                key={entry.id}
                className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_18rem] sm:items-center"
              >
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
                      if (selectedTeacherId) next[entry.course.id] = selectedTeacherId;
                      else delete next[entry.course.id];
                      return next;
                    });
                  }}
                >
                  <option value="">Select teacher</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={!canProgress || advanceSemester.isPending}
              onClick={() => void handleAdvance()}
            >
              <Wand2 className="size-4" />
              Advance to semester {klass.currentSemester + 1}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ClassStudentsSection({
  isLoading,
  isError,
  students,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  students: Array<{
    studentId: number;
    rollNumber: string;
    user: { fullName: string; email: string };
    class: { program: { code: string }; currentSemester: number; section: string };
  }>;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Students</h2>
      <DataState
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        empty={students.length === 0}
        emptyTitle="No students found"
        emptyDescription="Students assigned to this class will appear here."
      >
        <TableSurface
          title="Class students"
          description="Student name, roll number, email, and current class."
          tableClassName="min-w-190"
        >
          <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Roll number</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Class</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((student) => (
              <tr key={student.studentId}>
                <td className="px-4 py-3 font-medium">{student.user.fullName}</td>
                <td className="px-4 py-3">{student.rollNumber}</td>
                <td className="px-4 py-3">{student.user.email}</td>
                <td className="px-4 py-3">
                  {student.class.program.code} · S{student.class.currentSemester}
                  {student.class.section}
                </td>
              </tr>
            ))}
          </tbody>
        </TableSurface>
      </DataState>
    </div>
  );
}

function TransferStudentDialog({
  open,
  onOpenChange,
  candidates,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: Array<{
    studentId: number;
    rollNumber: string;
    user: { fullName: string; email: string };
    class: { program: { code: string }; currentSemester: number; section: string };
  }>;
  loading: boolean;
  onSubmit: (values: TransferStudentFormValues) => Promise<void>;
}) {
  const form = useForm<z.input<typeof transferStudentSchema>, unknown, TransferStudentFormValues>({
    resolver: zodResolver(transferStudentSchema),
    defaultValues: { studentId: 0 },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer student</DialogTitle>
          <DialogDescription>
            Only same-department students with an existing class are eligible.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
            onOpenChange(false);
            form.reset({ studentId: 0 });
          })}
        >
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Student</span>
            <select
              className={inputClassName}
              aria-invalid={form.formState.errors.studentId ? 'true' : undefined}
              aria-describedby={
                form.formState.errors.studentId ? 'transfer-student-error' : undefined
              }
              {...form.register('studentId')}
            >
              <option value="">Select student</option>
              {candidates.map((student) => (
                <option key={student.studentId} value={student.studentId}>
                  {student.user.fullName} · {student.rollNumber} · {student.class.program.code} S
                  {student.class.currentSemester}
                  {student.class.section}
                </option>
              ))}
            </select>
            {form.formState.errors.studentId ? (
              <span
                id="transfer-student-error"
                className="block text-sm text-destructive"
                role="alert"
              >
                {form.formState.errors.studentId.message}
              </span>
            ) : null}
          </label>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceTeacherDialog({
  open,
  onOpenChange,
  assignment,
  teachers,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: ClassCourseAssignment | null;
  teachers: Array<{ id: number; fullName: string; email: string }>;
  loading: boolean;
  onSubmit: (values: ReplaceTeacherFormValues) => Promise<void>;
}) {
  const form = useForm<z.input<typeof replaceTeacherSchema>, unknown, ReplaceTeacherFormValues>({
    resolver: zodResolver(replaceTeacherSchema),
    defaultValues: { teacherId: 0 },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace teacher</DialogTitle>
          <DialogDescription>
            {assignment
              ? `${assignment.course.code} remains assigned and its channel stays active.`
              : 'Select a replacement teacher.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
            form.reset({ teacherId: 0 });
          })}
        >
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Teacher</span>
            <select
              className={inputClassName}
              aria-invalid={form.formState.errors.teacherId ? 'true' : undefined}
              aria-describedby={
                form.formState.errors.teacherId ? 'replace-teacher-error' : undefined
              }
              {...form.register('teacherId')}
            >
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName} · {teacher.email}
                </option>
              ))}
            </select>
            {form.formState.errors.teacherId ? (
              <span
                id="replace-teacher-error"
                className="block text-sm text-destructive"
                role="alert"
              >
                {form.formState.errors.teacherId.message}
              </span>
            ) : null}
          </label>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              Replace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
