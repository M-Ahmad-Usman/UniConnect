import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, inputClassName } from '@/features/admin/components/AdminDataPrimitives';
import { usersApi } from '@/api/endpoints/users.api';
import { queryKeys } from '@/lib/constants';
import { UserType, type DepartmentListItem } from '@/types';
import { societySchema, type SocietyFormValues } from '../schemas';

interface SocietyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: DepartmentListItem[];
  loading: boolean;
  onSubmit: (values: SocietyFormValues) => Promise<void>;
}

export function SocietyDialog({
  open,
  onOpenChange,
  departments,
  loading,
  onSubmit,
}: SocietyDialogProps) {
  const form = useForm<SocietyFormValues>({
    resolver: zodResolver(societySchema),
    defaultValues: {
      name: '',
      description: '',
      departmentId: 0,
      presidentId: 0,
      convenorId: 0,
    },
  });
  const departmentId = useWatch({ control: form.control, name: 'departmentId' });
  const selectedDepartmentId = departmentId > 0 ? departmentId : undefined;

  const studentsQuery = useQuery({
    queryKey: queryKeys.users.list({
      userType: UserType.STUDENT,
      departmentId: selectedDepartmentId,
      limit: 50,
    }),
    queryFn: () =>
      usersApi.list({
        page: 1,
        limit: 50,
        userType: UserType.STUDENT,
        departmentId: selectedDepartmentId,
        isActive: true,
      }),
    enabled: open && selectedDepartmentId !== undefined,
  });

  const teachersQuery = useQuery({
    queryKey: queryKeys.users.list({
      userType: UserType.TEACHER,
      departmentId: selectedDepartmentId,
      limit: 50,
    }),
    queryFn: () =>
      usersApi.list({
        page: 1,
        limit: 50,
        userType: UserType.TEACHER,
        departmentId: selectedDepartmentId,
        isActive: true,
      }),
    enabled: open && selectedDepartmentId !== undefined,
  });

  useEffect(() => {
    form.setValue('presidentId', 0);
    form.setValue('convenorId', 0);
  }, [departmentId, form]);

  async function submit(values: SocietyFormValues) {
    await onSubmit({ ...values, description: values.description?.trim() || undefined });
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create society</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </FormField>
          <FormField label="Description" error={form.formState.errors.description?.message}>
            <Textarea rows={3} {...form.register('description')} />
          </FormField>
          <FormField label="Department" error={form.formState.errors.departmentId?.message}>
            <select className={inputClassName} {...form.register('departmentId', { valueAsNumber: true })}>
              <option value={0}>Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} · {department.name}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="President" error={form.formState.errors.presidentId?.message}>
              <select className={inputClassName} disabled={!selectedDepartmentId} {...form.register('presidentId', { valueAsNumber: true })}>
                <option value={0}>{studentsQuery.isLoading ? 'Loading students...' : 'Select student'}</option>
                {(studentsQuery.data?.data ?? []).map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Convenor" error={form.formState.errors.convenorId?.message}>
              <select className={inputClassName} disabled={!selectedDepartmentId} {...form.register('convenorId', { valueAsNumber: true })}>
                <option value={0}>{teachersQuery.isLoading ? 'Loading teachers...' : 'Select teacher'}</option>
                {(teachersQuery.data?.data ?? []).map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
