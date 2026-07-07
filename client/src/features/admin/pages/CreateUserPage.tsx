import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/lib/constants';
import { applyApiValidationErrors, getApiErrorMessage } from '@/features/auth/utils';
import { Gender, UserType } from '@/types';
import { useClasses } from '../hooks/useClasses';
import { useCreateUser } from '../hooks/useCreateUser';
import { useDepartmentPrograms } from '../hooks/useDepartmentPrograms';
import { useDepartments } from '../hooks/useDepartments';
import {
  createUserSchema,
  toCreateUserPayload,
  type CreateUserFormInput,
  type CreateUserFormValues,
} from '../schemas';

const defaultValues = {
  fullName: '',
  email: '',
  phone: '',
  gender: Gender.MALE,
  userType: UserType.STUDENT,
  departmentId: '',
  programId: '',
  classPublicId: '',
  rollNumber: '',
  designation: '',
} satisfies CreateUserFormInput;

function toNumberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function CreateUserPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const createUser = useCreateUser();
  const departmentsQuery = useDepartments();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateUserFormInput, unknown, CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues,
  });

  const userType = useWatch({ control, name: 'userType' });
  const departmentIdValue = useWatch({ control, name: 'departmentId' });
  const programIdValue = useWatch({ control, name: 'programId' });
  const departmentId = toNumberOrNull(departmentIdValue);
  const programId = toNumberOrNull(programIdValue);
  const programsQuery = useDepartmentPrograms(departmentId);
  const classesQuery = useClasses(programId);

  useEffect(() => {
    setValue('programId', '');
    setValue('classPublicId', '');
  }, [departmentId, setValue]);

  useEffect(() => {
    setValue('classPublicId', '');
  }, [programId, setValue]);

  const departmentOptions = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const programOptions = programsQuery.data ?? [];
  const classOptions = classesQuery.data ?? [];
  const selectedDepartment = useMemo(
    () => departmentOptions.find((department) => department.id === departmentId),
    [departmentId, departmentOptions],
  );

  const onSubmit = handleSubmit(async (rawValues) => {
    setFormError(null);

    try {
      const created = await createUser.mutateAsync(toCreateUserPayload(rawValues));
      toast.success(
        created.warning ??
          'User created. Temporary credentials were emailed and the user must change password on first login.',
      );
      navigate(ROUTES.ADMIN_USERS);
    } catch (error) {
      if (applyApiValidationErrors(error, setError)) {
        return;
      }
      setFormError(getApiErrorMessage(error, 'Unable to create user right now.'));
    }
  });

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Create user</h1>
          <p className="text-sm text-muted-foreground">
            Add a teacher or student account with first-login password change.
          </p>
        </div>
        <Button variant="outline" render={<Link to={ROUTES.ADMIN_USERS} />}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-lg border bg-card p-5" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="create-user-name">Full name</Label>
            <Input
              id="create-user-name"
              disabled={createUser.isPending}
              aria-invalid={errors.fullName ? true : undefined}
              {...register('fullName')}
            />
            {errors.fullName ? (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-email">Email</Label>
            <Input
              id="create-user-email"
              type="email"
              disabled={createUser.isPending}
              aria-invalid={errors.email ? true : undefined}
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-phone">Phone</Label>
            <Input
              id="create-user-phone"
              placeholder="03001234567"
              disabled={createUser.isPending}
              aria-invalid={errors.phone ? true : undefined}
              {...register('phone')}
            />
            {errors.phone ? (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-gender">Gender</Label>
            <select
              id="create-user-gender"
              disabled={createUser.isPending}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...register('gender')}
            >
              <option value={Gender.MALE}>Male</option>
              <option value={Gender.FEMALE}>Female</option>
            </select>
            {errors.gender ? (
              <p className="text-sm text-destructive">{errors.gender.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-user-type">User type</Label>
            <select
              id="create-user-type"
              disabled={createUser.isPending}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...register('userType')}
            >
              <option value={UserType.STAFF}>Staff</option>
              <option value={UserType.STUDENT}>Student</option>
              <option value={UserType.TEACHER}>Teacher</option>
            </select>
          </div>

          {userType !== UserType.STAFF ? (
            <div className="space-y-2">
              <Label htmlFor="create-user-department">Department</Label>
              <select
                id="create-user-department"
                disabled={createUser.isPending || departmentsQuery.isLoading}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...register('departmentId')}
              >
                <option value="">Select department</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code} · {department.name}
                  </option>
                ))}
              </select>
              {'departmentId' in errors && errors.departmentId ? (
                <p className="text-sm text-destructive">{errors.departmentId.message}</p>
              ) : null}
            </div>
          ) : null}

          {userType === UserType.TEACHER ? (
            <div className="space-y-2">
              <Label htmlFor="create-user-designation">Designation</Label>
              <Input
                id="create-user-designation"
                disabled={createUser.isPending}
                aria-invalid={'designation' in errors && errors.designation ? true : undefined}
                {...register('designation')}
              />
              {'designation' in errors && errors.designation ? (
                <p className="text-sm text-destructive">{errors.designation.message}</p>
              ) : null}
            </div>
          ) : null}

          {userType === UserType.STUDENT ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="create-user-program">Program</Label>
                <select
                  id="create-user-program"
                  disabled={createUser.isPending || !selectedDepartment || programsQuery.isLoading}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...register('programId')}
                >
                  <option value="">Select program</option>
                  {programOptions.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.code} · {program.discipline.name}
                    </option>
                  ))}
                </select>
                {'programId' in errors && errors.programId ? (
                  <p className="text-sm text-destructive">{errors.programId.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-user-class">Class</Label>
                <select
                  id="create-user-class"
                  disabled={createUser.isPending || !programId || classesQuery.isLoading}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...register('classPublicId')}
                >
                  <option value="">Select class</option>
                  {classOptions.map((klass) => (
                    <option key={klass.publicId} value={klass.publicId}>
                      Semester {klass.currentSemester} · Section {klass.section} ·{' '}
                      {klass.admissionYear}
                    </option>
                  ))}
                </select>
                {'classPublicId' in errors && errors.classPublicId ? (
                  <p className="text-sm text-destructive">{errors.classPublicId.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-user-roll">Roll number</Label>
                <Input
                  id="create-user-roll"
                  placeholder="22-NTU-CS-1184"
                  disabled={createUser.isPending}
                  aria-invalid={'rollNumber' in errors && errors.rollNumber ? true : undefined}
                  {...register('rollNumber')}
                />
                {'rollNumber' in errors && errors.rollNumber ? (
                  <p className="text-sm text-destructive">{errors.rollNumber.message}</p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {formError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={createUser.isPending}>
            <Save className="size-4" />
            {createUser.isPending ? 'Creating...' : 'Create user'}
          </Button>
        </div>
      </form>
    </section>
  );
}
