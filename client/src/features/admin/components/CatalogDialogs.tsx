import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  CourseListItem,
  DegreeLevel,
  DepartmentListItem,
  Discipline,
  ProgramListItem,
} from '@/types';
import { FormField, inputClassName } from './AdminDataPrimitives';
import {
  classSchema,
  courseSchema,
  copyCurriculumBatchSchema,
  curriculumSchema,
  departmentSchema,
  disciplineSchema,
  globalProgramSchema,
  programSchema,
  teacherAssignmentSchema,
  updateCourseSchema,
  updateProgramSchema,
  type ClassFormValues,
  type CourseFormValues,
  type CopyCurriculumBatchFormValues,
  type CurriculumFormValues,
  type DepartmentFormValues,
  type DisciplineFormValues,
  type GlobalProgramFormValues,
  type ProgramFormValues,
  type TeacherAssignmentFormValues,
  type UpdateCourseFormValues,
  type UpdateProgramFormValues,
} from '../schemas';

function SubmitButton({
  loading,
  label,
  disabled = false,
}: {
  loading: boolean;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Button type="submit" disabled={loading || disabled}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {label}
    </Button>
  );
}

export function DepartmentDialog({
  open,
  onOpenChange,
  initial,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: DepartmentListItem;
  loading: boolean;
  onSubmit: (values: DepartmentFormValues) => Promise<void>;
}) {
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: '', code: '' },
  });

  useEffect(() => {
    form.reset({ name: initial?.name ?? '', code: initial?.code ?? '' });
  }, [form, initial, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit department' : 'Create department'}</DialogTitle>
          <DialogDescription>
            Department creation also creates the linked department server.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          })}
        >
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <input className={inputClassName} {...form.register('name')} />
          </FormField>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <input className={inputClassName} {...form.register('code')} />
          </FormField>
          <DialogFooter>
            <SubmitButton loading={loading} label={initial ? 'Save changes' : 'Create'} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DisciplineDialog({
  open,
  onOpenChange,
  initial,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Discipline;
  loading: boolean;
  onSubmit: (values: DisciplineFormValues) => Promise<void>;
}) {
  const form = useForm<DisciplineFormValues>({
    resolver: zodResolver(disciplineSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    form.reset({ name: initial?.name ?? '' });
  }, [form, initial, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Rename discipline' : 'Create discipline'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          })}
        >
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <input className={inputClassName} {...form.register('name')} />
          </FormField>
          <DialogFooter>
            <SubmitButton loading={loading} label={initial ? 'Save changes' : 'Create'} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProgramDialog({
  open,
  onOpenChange,
  initial,
  disciplines,
  degreeLevels,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ProgramListItem;
  disciplines: Discipline[];
  degreeLevels: DegreeLevel[];
  loading: boolean;
  onSubmit: (values: ProgramFormValues | UpdateProgramFormValues) => Promise<boolean | void>;
}) {
  const createForm = useForm<z.input<typeof programSchema>, unknown, ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: { disciplineId: 0, degreeLevelId: 0, semesters: 8, code: '' },
  });
  const updateForm = useForm<z.input<typeof updateProgramSchema>, unknown, UpdateProgramFormValues>(
    {
      resolver: zodResolver(updateProgramSchema),
      defaultValues: { semesters: 8, code: '' },
    },
  );

  useEffect(() => {
    if (initial) {
      updateForm.reset({ semesters: initial.semesters, code: initial.code });
    } else {
      createForm.reset({ disciplineId: 0, degreeLevelId: 0, semesters: 8, code: '' });
    }
  }, [createForm, initial, open, updateForm]);

  const programHasClasses = (initial?._count?.classes ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit program' : 'Create program'}</DialogTitle>
          <DialogDescription>
            Department, discipline, and degree level are immutable after creation.
          </DialogDescription>
        </DialogHeader>
        {initial ? (
          <form
            className="space-y-4"
            onSubmit={updateForm.handleSubmit(async (values) => {
              const shouldClose = await onSubmit(values);
              if (shouldClose !== false) {
                onOpenChange(false);
              }
            })}
          >
            <FormField label="Code" error={updateForm.formState.errors.code?.message}>
              <input
                className={inputClassName}
                disabled={programHasClasses}
                {...updateForm.register('code')}
              />
            </FormField>
            <FormField label="Semesters" error={updateForm.formState.errors.semesters?.message}>
              <input
                type="number"
                min={1}
                max={10}
                className={inputClassName}
                disabled={programHasClasses}
                {...updateForm.register('semesters')}
              />
            </FormField>
            {programHasClasses ? (
              <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                Program code and semester count are locked because classes already exist.
              </p>
            ) : null}
            <DialogFooter>
              <SubmitButton
                loading={loading}
                label="Save changes"
                disabled={programHasClasses}
              />
            </DialogFooter>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={createForm.handleSubmit(async (values) => {
              await onSubmit(values);
              onOpenChange(false);
            })}
          >
            <>
              <FormField
                label="Discipline"
                error={createForm.formState.errors.disciplineId?.message}
              >
                <select className={inputClassName} {...createForm.register('disciplineId')}>
                  <option value="">Select discipline</option>
                  {disciplines.map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Degree level"
                error={createForm.formState.errors.degreeLevelId?.message}
              >
                <select className={inputClassName} {...createForm.register('degreeLevelId')}>
                  <option value="">Select degree level</option>
                  {degreeLevels.map((degreeLevel) => (
                    <option key={degreeLevel.id} value={degreeLevel.id}>
                      {degreeLevel.level}
                    </option>
                  ))}
                </select>
              </FormField>
            </>
            <FormField label="Code" error={createForm.formState.errors.code?.message}>
              <input className={inputClassName} {...createForm.register('code')} />
            </FormField>
            <FormField label="Semesters" error={createForm.formState.errors.semesters?.message}>
              <input
                type="number"
                min={1}
                max={10}
                className={inputClassName}
                {...createForm.register('semesters')}
              />
            </FormField>
            <DialogFooter>
              <SubmitButton loading={loading} label="Create" />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function GlobalProgramDialog({
  open,
  onOpenChange,
  departments,
  disciplines,
  degreeLevels,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: DepartmentListItem[];
  disciplines: Discipline[];
  degreeLevels: DegreeLevel[];
  loading: boolean;
  onSubmit: (values: GlobalProgramFormValues) => Promise<void>;
}) {
  const form = useForm<z.input<typeof globalProgramSchema>, unknown, GlobalProgramFormValues>({
    resolver: zodResolver(globalProgramSchema),
    defaultValues: {
      departmentId: 0,
      disciplineId: 0,
      degreeLevelId: 0,
      semesters: 8,
      code: '',
    },
  });

  useEffect(() => {
    form.reset({
      departmentId: 0,
      disciplineId: 0,
      degreeLevelId: 0,
      semesters: 8,
      code: '',
    });
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create program</DialogTitle>
          <DialogDescription>
            Select the owning department first. Program creation also creates the linked department
            program channel.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          })}
        >
          <FormField
            label="Department"
            error={form.formState.errors.departmentId?.message}
            className="sm:col-span-2"
          >
            <select className={inputClassName} {...form.register('departmentId')}>
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} · {department.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Discipline" error={form.formState.errors.disciplineId?.message}>
            <select className={inputClassName} {...form.register('disciplineId')}>
              <option value="">Select discipline</option>
              {disciplines.map((discipline) => (
                <option key={discipline.id} value={discipline.id}>
                  {discipline.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Degree level" error={form.formState.errors.degreeLevelId?.message}>
            <select className={inputClassName} {...form.register('degreeLevelId')}>
              <option value="">Select degree level</option>
              {degreeLevels.map((degreeLevel) => (
                <option key={degreeLevel.id} value={degreeLevel.id}>
                  {degreeLevel.level}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Code" error={form.formState.errors.code?.message}>
            <input className={inputClassName} placeholder="BSCS" {...form.register('code')} />
          </FormField>
          <FormField label="Semesters" error={form.formState.errors.semesters?.message}>
            <input
              type="number"
              min={1}
              max={10}
              className={inputClassName}
              {...form.register('semesters')}
            />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <SubmitButton loading={loading} label="Create program" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClassDialog({
  open,
  onOpenChange,
  programs,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: ProgramListItem[];
  loading: boolean;
  onSubmit: (values: ClassFormValues) => Promise<void>;
}) {
  const currentYear = new Date().getFullYear();
  const form = useForm<z.input<typeof classSchema>, unknown, ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      programId: 0,
      currentSemester: 1,
      academicYear: currentYear,
      admissionYear: currentYear,
      section: 'A',
    },
  });

  useEffect(() => {
    form.reset({
      programId: 0,
      currentSemester: 1,
      academicYear: currentYear,
      admissionYear: currentYear,
      section: 'A',
    });
  }, [currentYear, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create class</DialogTitle>
          <DialogDescription>
            Class creation also creates the linked class server.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          })}
        >
          <FormField
            label="Program"
            error={form.formState.errors.programId?.message}
            className="sm:col-span-2"
          >
            <select className={inputClassName} {...form.register('programId')}>
              <option value="">Select program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code} · {program.discipline.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Current semester"
            error={form.formState.errors.currentSemester?.message}
          >
            <input
              type="number"
              min={1}
              max={10}
              className={inputClassName}
              {...form.register('currentSemester')}
            />
          </FormField>
          <FormField label="Section" error={form.formState.errors.section?.message}>
            <select className={inputClassName} {...form.register('section')}>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </FormField>
          <FormField label="Academic year" error={form.formState.errors.academicYear?.message}>
            <input type="number" className={inputClassName} {...form.register('academicYear')} />
          </FormField>
          <FormField label="Admission year" error={form.formState.errors.admissionYear?.message}>
            <input type="number" className={inputClassName} {...form.register('admissionYear')} />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <SubmitButton loading={loading} label="Create" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CourseDialog({
  open,
  onOpenChange,
  initial,
  departments,
  lockDepartment = false,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CourseListItem;
  departments: DepartmentListItem[];
  lockDepartment?: boolean;
  loading: boolean;
  onSubmit: (values: CourseFormValues | UpdateCourseFormValues) => Promise<void>;
}) {
  const lockedDepartment = lockDepartment && departments.length === 1 ? departments[0] : null;
  const createForm = useForm<z.input<typeof courseSchema>, unknown, CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      code: '',
      creditHours: 3,
      departmentId: lockedDepartment?.id ?? 0,
    },
  });
  const updateForm = useForm<z.input<typeof updateCourseSchema>, unknown, UpdateCourseFormValues>({
    resolver: zodResolver(updateCourseSchema),
    defaultValues: { title: '', code: '', creditHours: 3 },
  });

  useEffect(() => {
    if (initial) {
      updateForm.reset({
        title: initial.title,
        code: initial.code,
        creditHours: initial.creditHours,
      });
    } else {
      createForm.reset({
        title: '',
        code: '',
        creditHours: 3,
        departmentId: lockedDepartment?.id ?? 0,
      });
    }
  }, [createForm, initial, lockedDepartment?.id, open, updateForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit course' : 'Create course'}</DialogTitle>
          <DialogDescription>Course department is fixed after creation.</DialogDescription>
        </DialogHeader>
        {initial ? (
          <form
            className="space-y-4"
            onSubmit={updateForm.handleSubmit(async (values) => {
              await onSubmit(values);
              onOpenChange(false);
            })}
          >
            <FormField label="Title" error={updateForm.formState.errors.title?.message}>
              <input className={inputClassName} {...updateForm.register('title')} />
            </FormField>
            <FormField label="Code" error={updateForm.formState.errors.code?.message}>
              <input className={inputClassName} {...updateForm.register('code')} />
            </FormField>
            <FormField
              label="Credit hours"
              error={updateForm.formState.errors.creditHours?.message}
            >
              <input
                type="number"
                min={1}
                max={6}
                className={inputClassName}
                {...updateForm.register('creditHours')}
              />
            </FormField>
            <DialogFooter>
              <SubmitButton loading={loading} label="Save changes" />
            </DialogFooter>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={createForm.handleSubmit(async (values) => {
              await onSubmit(values);
              onOpenChange(false);
            })}
          >
            <FormField label="Title" error={createForm.formState.errors.title?.message}>
              <input className={inputClassName} {...createForm.register('title')} />
            </FormField>
            <FormField label="Code" error={createForm.formState.errors.code?.message}>
              <input className={inputClassName} {...createForm.register('code')} />
            </FormField>
            <FormField
              label="Credit hours"
              error={createForm.formState.errors.creditHours?.message}
            >
              <input
                type="number"
                min={1}
                max={6}
                className={inputClassName}
                {...createForm.register('creditHours')}
              />
            </FormField>
            {lockedDepartment ? (
              <FormField
                label="Department"
                error={createForm.formState.errors.departmentId?.message}
              >
                <input
                  className={inputClassName}
                  value={`${lockedDepartment.code} · ${lockedDepartment.name}`}
                  readOnly
                />
                <input type="hidden" {...createForm.register('departmentId')} />
              </FormField>
            ) : (
              <FormField
                label="Department"
                error={createForm.formState.errors.departmentId?.message}
              >
                <select className={inputClassName} {...createForm.register('departmentId')}>
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.code} · {department.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
            <DialogFooter>
              <SubmitButton loading={loading} label="Create" />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CurriculumDialog({
  open,
  onOpenChange,
  courses,
  coursesLoading,
  courseSearch,
  onCourseSearchChange,
  defaultBatchYear,
  maxSemester,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CourseListItem[];
  coursesLoading: boolean;
  courseSearch: string;
  onCourseSearchChange: (search: string) => void;
  defaultBatchYear: number;
  maxSemester: number;
  loading: boolean;
  onSubmit: (values: CurriculumFormValues) => Promise<void>;
}) {
  const form = useForm<z.input<typeof curriculumSchema>, unknown, CurriculumFormValues>({
    resolver: zodResolver(curriculumSchema),
    defaultValues: { courseIds: [], semesterNumber: 1, batchYear: defaultBatchYear },
  });

  useEffect(() => {
    form.reset({ courseIds: [], semesterNumber: 1, batchYear: defaultBatchYear });
  }, [defaultBatchYear, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add curriculum courses</DialogTitle>
          <DialogDescription>
            Select every course for the chosen semester. Courses already present in this batch are
            skipped automatically.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          })}
        >
          <FormField label="Search courses">
            <input
              className={inputClassName}
              value={courseSearch}
              onChange={(event) => onCourseSearchChange(event.target.value)}
              placeholder="Search by course code or title"
            />
          </FormField>
          <FormField label="Courses" error={form.formState.errors.courseIds?.message}>
            <div className="max-h-64 overflow-y-auto rounded-lg border bg-background p-2">
              {coursesLoading ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">Loading courses...</p>
              ) : courses.length > 0 ? (
                <div className="grid gap-1">
                  {courses.map((course) => (
                    <label
                      key={course.id}
                      className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        value={course.id}
                        className="mt-0.5 size-4"
                        {...form.register('courseIds')}
                      />
                      <span>
                        <span className="font-medium">{course.code}</span>
                        <span className="text-muted-foreground"> · {course.title}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  No matching courses are available for this program department.
                </p>
              )}
            </div>
          </FormField>
          <FormField label="Semester" error={form.formState.errors.semesterNumber?.message}>
            <input
              type="number"
              min={1}
              max={maxSemester}
              className={inputClassName}
              {...form.register('semesterNumber')}
            />
          </FormField>
          <FormField label="Batch year" error={form.formState.errors.batchYear?.message}>
            <input type="number" className={inputClassName} {...form.register('batchYear')} />
          </FormField>
          <DialogFooter>
            <SubmitButton
              loading={loading}
              disabled={coursesLoading || courses.length === 0}
              label="Add courses"
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CopyCurriculumBatchDialog({
  open,
  onOpenChange,
  defaultSourceBatchYear,
  defaultTargetBatchYear,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSourceBatchYear: number;
  defaultTargetBatchYear: number;
  loading: boolean;
  onSubmit: (values: CopyCurriculumBatchFormValues) => Promise<void>;
}) {
  const form = useForm<
    z.input<typeof copyCurriculumBatchSchema>,
    unknown,
    CopyCurriculumBatchFormValues
  >({
    resolver: zodResolver(copyCurriculumBatchSchema),
    defaultValues: {
      sourceBatchYear: defaultSourceBatchYear,
      targetBatchYear: defaultTargetBatchYear,
    },
  });

  useEffect(() => {
    form.reset({
      sourceBatchYear: defaultSourceBatchYear,
      targetBatchYear: defaultTargetBatchYear,
    });
  }, [defaultSourceBatchYear, defaultTargetBatchYear, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy batch curriculum</DialogTitle>
          <DialogDescription>
            Copy a complete source batch into a target batch. Existing target courses are skipped.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          })}
        >
          <FormField
            label="Source batch"
            error={form.formState.errors.sourceBatchYear?.message}
          >
            <input type="number" className={inputClassName} {...form.register('sourceBatchYear')} />
          </FormField>
          <FormField
            label="Target batch"
            error={form.formState.errors.targetBatchYear?.message}
          >
            <input type="number" className={inputClassName} {...form.register('targetBatchYear')} />
          </FormField>
          <DialogFooter>
            <SubmitButton loading={loading} label="Copy curriculum" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AssignCourseDialog({
  open,
  onOpenChange,
  courses,
  teachers,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CourseListItem[];
  teachers: Array<{ publicId: string; fullName: string; email: string }>;
  loading: boolean;
  onSubmit: (values: { courseId: number; teacherPublicId: string }) => Promise<void>;
}) {
  const form = useForm<
    z.input<typeof teacherAssignmentSchema>,
    unknown,
    TeacherAssignmentFormValues
  >({
    resolver: zodResolver(teacherAssignmentSchema),
    defaultValues: { courseId: '', teacherPublicId: '' },
  });

  useEffect(() => {
    form.reset({ courseId: '', teacherPublicId: '' });
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign course</DialogTitle>
          <DialogDescription>
            Assign a curriculum course to this class with an eligible teacher.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          })}
        >
          <FormField label="Course" error={form.formState.errors.courseId?.message}>
            <select
              className={inputClassName}
              aria-invalid={form.formState.errors.courseId ? 'true' : undefined}
              {...form.register('courseId')}
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} · {course.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Teacher" error={form.formState.errors.teacherPublicId?.message}>
            <select
              className={inputClassName}
              aria-invalid={form.formState.errors.teacherPublicId ? 'true' : undefined}
              {...form.register('teacherPublicId')}
            >
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.publicId} value={teacher.publicId}>
                  {teacher.fullName} · {teacher.email}
                </option>
              ))}
            </select>
          </FormField>
          <DialogFooter>
            <SubmitButton loading={loading} label="Assign" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
