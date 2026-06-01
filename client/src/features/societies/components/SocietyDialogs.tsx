import { useEffect, useMemo, useState, type SelectHTMLAttributes } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, inputClassName } from '@/features/admin/components/AdminDataPrimitives';
import type { DepartmentListItem, UpdateSocietyRequest, UserSummary } from '@/types';
import { useSocietyLeadershipCandidates } from '../hooks/useSocieties';
import {
  societySchema,
  updateSocietySchema,
  type SocietyFormValues,
  type UpdateSocietyFormValues,
} from '../schemas';

interface SocietyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: DepartmentListItem[];
  loading: boolean;
  onSubmit: (values: SocietyFormValues) => Promise<void>;
}

interface SocietyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: number;
  initialValues: {
    name: string;
    description: string;
    presidentPublicId: string;
    presidentName: string;
    convenorPublicId: string;
    convenorName: string;
  };
  canChangeLeadership: boolean;
  loading: boolean;
  onSubmit: (values: UpdateSocietyRequest) => Promise<void>;
}

function candidateLabel(candidate: UserSummary) {
  return `${candidate.fullName} · ${candidate.email}`;
}

function useLeadershipCandidates(
  departmentId: number | undefined,
  role: 'president' | 'convenor',
  search: string,
  enabled: boolean,
) {
  const params = useMemo(
    () =>
      departmentId
        ? {
            departmentId,
            role,
            page: 1,
            limit: 50,
            search: search.trim() || undefined,
          }
        : null,
    [departmentId, role, search],
  );

  return useSocietyLeadershipCandidates(params, enabled && departmentId !== undefined);
}

function LeadershipSelects({
  open,
  departmentId,
  presidentPublicId,
  convenorPublicId,
  presidentLabel,
  convenorLabel,
  onPresidentSearchChange,
  onConvenorSearchChange,
  presidentSearch,
  convenorSearch,
  presidentRegistration,
  convenorRegistration,
  disabled = false,
  presidentError,
  convenorError,
}: {
  open: boolean;
  departmentId: number | undefined;
  presidentPublicId?: string;
  convenorPublicId?: string;
  presidentLabel?: string;
  convenorLabel?: string;
  onPresidentSearchChange: (value: string) => void;
  onConvenorSearchChange: (value: string) => void;
  presidentSearch: string;
  convenorSearch: string;
  presidentRegistration: SelectHTMLAttributes<HTMLSelectElement>;
  convenorRegistration: SelectHTMLAttributes<HTMLSelectElement>;
  disabled?: boolean;
  presidentError?: string;
  convenorError?: string;
}) {
  const presidentsQuery = useLeadershipCandidates(
    departmentId,
    'president',
    presidentSearch,
    open && !disabled,
  );
  const convenorsQuery = useLeadershipCandidates(
    departmentId,
    'convenor',
    convenorSearch,
    open && !disabled,
  );
  const presidents = presidentsQuery.data?.data ?? [];
  const convenors = convenorsQuery.data?.data ?? [];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField
        label="President"
        error={presidentError}
        description="Search is scoped to eligible students in the selected department."
      >
        <div className="space-y-2">
          <Input
            value={presidentSearch}
            disabled={!departmentId || disabled}
            placeholder="Search students"
            onChange={(event) => onPresidentSearchChange(event.target.value)}
          />
          <select
            className={inputClassName}
            disabled={!departmentId || disabled}
            aria-invalid={presidentError ? 'true' : undefined}
            {...presidentRegistration}
          >
            <option value={presidentPublicId ?? ''}>
              {presidentLabel ??
                (presidentsQuery.isLoading ? 'Loading students...' : 'Select student')}
            </option>
            {presidents.map((student) => (
              <option key={student.publicId} value={student.publicId}>
                {candidateLabel(student)}
              </option>
            ))}
          </select>
        </div>
      </FormField>
      <FormField
        label="Convenor"
        error={convenorError}
        description="Search is scoped to eligible teachers in the selected department."
      >
        <div className="space-y-2">
          <Input
            value={convenorSearch}
            disabled={!departmentId || disabled}
            placeholder="Search teachers"
            onChange={(event) => onConvenorSearchChange(event.target.value)}
          />
          <select
            className={inputClassName}
            disabled={!departmentId || disabled}
            aria-invalid={convenorError ? 'true' : undefined}
            {...convenorRegistration}
          >
            <option value={convenorPublicId ?? ''}>
              {convenorLabel ??
                (convenorsQuery.isLoading ? 'Loading teachers...' : 'Select teacher')}
            </option>
            {convenors.map((teacher) => (
              <option key={teacher.publicId} value={teacher.publicId}>
                {candidateLabel(teacher)}
              </option>
            ))}
          </select>
        </div>
      </FormField>
    </div>
  );
}

export function SocietyDialog({
  open,
  onOpenChange,
  departments,
  loading,
  onSubmit,
}: SocietyDialogProps) {
  const [presidentSearch, setPresidentSearch] = useState('');
  const [convenorSearch, setConvenorSearch] = useState('');
  const form = useForm<SocietyFormValues>({
    resolver: zodResolver(societySchema),
    defaultValues: {
      name: '',
      description: '',
      departmentId: 0,
      presidentPublicId: '',
      convenorPublicId: '',
    },
  });
  const departmentId = useWatch({ control: form.control, name: 'departmentId' });
  const selectedDepartmentId = departmentId > 0 ? departmentId : undefined;
  const departmentRegistration = form.register('departmentId', { valueAsNumber: true });

  useEffect(() => {
    form.setValue('presidentPublicId', '');
    form.setValue('convenorPublicId', '');
  }, [departmentId, form]);

  async function submit(values: SocietyFormValues) {
    await onSubmit({ ...values, description: values.description?.trim() || undefined });
    form.reset();
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPresidentSearch('');
      setConvenorSearch('');
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create society</DialogTitle>
          <DialogDescription>
            Create a society workspace with department-scoped leadership.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input
              aria-invalid={form.formState.errors.name ? 'true' : undefined}
              {...form.register('name')}
            />
          </FormField>
          <FormField label="Description" error={form.formState.errors.description?.message}>
            <Textarea
              rows={3}
              aria-invalid={form.formState.errors.description ? 'true' : undefined}
              {...form.register('description')}
            />
          </FormField>
          <FormField label="Department" error={form.formState.errors.departmentId?.message}>
            <select
              className={inputClassName}
              aria-invalid={form.formState.errors.departmentId ? 'true' : undefined}
              {...departmentRegistration}
              onChange={(event) => {
                void departmentRegistration.onChange(event);
                setPresidentSearch('');
                setConvenorSearch('');
              }}
            >
              <option value={0}>Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} · {department.name}
                </option>
              ))}
            </select>
          </FormField>
          <LeadershipSelects
            open={open}
            departmentId={selectedDepartmentId}
            presidentSearch={presidentSearch}
            convenorSearch={convenorSearch}
            onPresidentSearchChange={setPresidentSearch}
            onConvenorSearchChange={setConvenorSearch}
            presidentRegistration={form.register('presidentPublicId')}
            convenorRegistration={form.register('convenorPublicId')}
            presidentError={form.formState.errors.presidentPublicId?.message}
            convenorError={form.formState.errors.convenorPublicId?.message}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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

export function SocietyEditDialog({
  open,
  onOpenChange,
  departmentId,
  initialValues,
  canChangeLeadership,
  loading,
  onSubmit,
}: SocietyEditDialogProps) {
  const [presidentSearch, setPresidentSearch] = useState('');
  const [convenorSearch, setConvenorSearch] = useState('');
  const form = useForm<UpdateSocietyFormValues>({
    resolver: zodResolver(updateSocietySchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(initialValues);
  }, [form, initialValues, open]);

  async function submit(values: UpdateSocietyFormValues) {
    const payload: UpdateSocietyRequest = {};
    const nextName = values.name?.trim();
    const nextDescription = values.description?.trim() || undefined;

    if (nextName && nextName !== initialValues.name) {
      payload.name = nextName;
    }

    if (nextDescription !== (initialValues.description || undefined)) {
      payload.description = nextDescription;
    }

    if (canChangeLeadership && values.presidentPublicId !== initialValues.presidentPublicId) {
      payload.presidentPublicId = values.presidentPublicId;
    }

    if (canChangeLeadership && values.convenorPublicId !== initialValues.convenorPublicId) {
      payload.convenorPublicId = values.convenorPublicId;
    }

    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }

    await onSubmit(payload);
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPresidentSearch('');
      setConvenorSearch('');
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit society</DialogTitle>
          <DialogDescription>
            Update society details and leadership options available to your role.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input
              aria-invalid={form.formState.errors.name ? 'true' : undefined}
              {...form.register('name')}
            />
          </FormField>
          <FormField label="Description" error={form.formState.errors.description?.message}>
            <Textarea
              rows={3}
              aria-invalid={form.formState.errors.description ? 'true' : undefined}
              {...form.register('description')}
            />
          </FormField>
          {canChangeLeadership ? (
            <LeadershipSelects
              open={open}
              departmentId={departmentId}
              presidentPublicId={initialValues.presidentPublicId}
              presidentLabel={initialValues.presidentName}
              convenorPublicId={initialValues.convenorPublicId}
              convenorLabel={initialValues.convenorName}
              presidentSearch={presidentSearch}
              convenorSearch={convenorSearch}
              onPresidentSearchChange={setPresidentSearch}
              onConvenorSearchChange={setConvenorSearch}
              presidentRegistration={form.register('presidentPublicId')}
              convenorRegistration={form.register('convenorPublicId')}
              presidentError={form.formState.errors.presidentPublicId?.message}
              convenorError={form.formState.errors.convenorPublicId?.message}
            />
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
