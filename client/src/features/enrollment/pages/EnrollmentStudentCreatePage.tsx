import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AdminPageHeader,
  FormField,
  inputClassName,
} from '@/features/admin/components/AdminDataPrimitives';
import { Gender } from '@/types';
import { ROUTES } from '@/lib/constants';
import {
  useCreateEnrollmentStudent,
  useEnrollmentBootstrap,
  useEnrollmentClasses,
  useEnrollmentPrograms,
} from '../hooks/useEnrollment';
import {
  enrollmentStudentFormSchema,
  type EnrollmentStudentFormInput,
  type EnrollmentStudentUiFormValues,
} from '../schemas';

function toNumberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function EnrollmentStudentCreatePage() {
  const navigate = useNavigate();
  const bootstrapQuery = useEnrollmentBootstrap();
  const createStudent = useCreateEnrollmentStudent();
  const form = useForm<EnrollmentStudentFormInput, unknown, EnrollmentStudentUiFormValues>({
    resolver: zodResolver(enrollmentStudentFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      gender: Gender.MALE,
      departmentId: '',
      programId: '',
      classPublicId: '',
      rollNumber: '',
    },
  });
  const departmentIdValue = useWatch({ control: form.control, name: 'departmentId' });
  const programIdValue = useWatch({ control: form.control, name: 'programId' });
  const departmentId =
    toNumberOrNull(departmentIdValue) ?? bootstrapQuery.data?.defaultDepartmentId ?? null;
  const programId = toNumberOrNull(programIdValue);
  const programsQuery = useEnrollmentPrograms(
    { page: 1, limit: 100, departmentId: departmentId ?? undefined },
    departmentId !== null,
  );
  const classesQuery = useEnrollmentClasses(
    { page: 1, limit: 100, programId: programId ?? undefined },
    programId !== null,
  );
  const departments = useMemo(
    () => bootstrapQuery.data?.departments ?? [],
    [bootstrapQuery.data?.departments],
  );
  const programs = programsQuery.data?.data ?? [];
  const classes = classesQuery.data?.data ?? [];
  const selectedDepartmentId = departmentId ?? undefined;

  useEffect(() => {
    if (!departmentIdValue && bootstrapQuery.data?.defaultDepartmentId) {
      form.setValue('departmentId', String(bootstrapQuery.data.defaultDepartmentId));
    }
  }, [bootstrapQuery.data?.defaultDepartmentId, departmentIdValue, form]);

  useEffect(() => {
    form.setValue('programId', '');
    form.setValue('classPublicId', '');
  }, [selectedDepartmentId, form]);

  useEffect(() => {
    form.setValue('classPublicId', '');
  }, [programId, form]);

  const currentDepartment = useMemo(
    () => departments.find((department) => department.id === selectedDepartmentId),
    [departments, selectedDepartmentId],
  );

  async function onSubmit(values: EnrollmentStudentUiFormValues) {
    await createStudent.mutateAsync({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      gender: values.gender,
      classPublicId: values.classPublicId,
      rollNumber: values.rollNumber,
    });
    navigate(ROUTES.ENROLLMENT_CLASS(values.classPublicId));
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <AdminPageHeader
        eyebrow="Enrollment"
        title="Create student"
        description="Create a student account directly into an authorized class."
      />

      <form
        className="space-y-5 rounded-lg border bg-card p-5"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Department">
            <select
              className={inputClassName}
              disabled={createStudent.isPending || departments.length <= 1}
              {...form.register('departmentId')}
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} · {department.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Program">
            <select
              className={inputClassName}
              disabled={createStudent.isPending || !currentDepartment || programsQuery.isLoading}
              {...form.register('programId')}
            >
              <option value="">Select program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Class" error={form.formState.errors.classPublicId?.message}>
            <select
              className={inputClassName}
              disabled={createStudent.isPending || !programId || classesQuery.isLoading}
              {...form.register('classPublicId')}
            >
              <option value="">Select class</option>
              {classes.map((klass) => (
                <option key={klass.publicId} value={klass.publicId}>
                  Semester {klass.currentSemester} · Section {klass.section} · {klass.admissionYear}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Roll number" error={form.formState.errors.rollNumber?.message}>
            <input
              className={inputClassName}
              placeholder="22-NTU-CS-1184"
              disabled={createStudent.isPending}
              {...form.register('rollNumber')}
            />
          </FormField>
          <FormField label="Full name" error={form.formState.errors.fullName?.message}>
            <input className={inputClassName} disabled={createStudent.isPending} {...form.register('fullName')} />
          </FormField>
          <FormField label="Email" error={form.formState.errors.email?.message}>
            <input className={inputClassName} type="email" disabled={createStudent.isPending} {...form.register('email')} />
          </FormField>
          <FormField label="Phone" error={form.formState.errors.phone?.message}>
            <input className={inputClassName} disabled={createStudent.isPending} {...form.register('phone')} />
          </FormField>
          <FormField label="Gender" error={form.formState.errors.gender?.message}>
            <select className={inputClassName} disabled={createStudent.isPending} {...form.register('gender')}>
              <option value={Gender.MALE}>Male</option>
              <option value={Gender.FEMALE}>Female</option>
            </select>
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={createStudent.isPending}>
            <Save className="size-4" />
            {createStudent.isPending ? 'Creating...' : 'Create student'}
          </Button>
        </div>
      </form>
    </section>
  );
}
