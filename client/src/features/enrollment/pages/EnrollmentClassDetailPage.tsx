import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowLeft, MoveRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AdminPageHeader,
  DataState,
  FormField,
  TableSurface,
  inputClassName,
} from '@/features/admin/components/AdminDataPrimitives';
import { DEFAULT_PAGE_SIZE, ROUTES } from '@/lib/constants';
import { parseRouteParamPublicId } from '@/lib/route-params';
import {
  useEnrollmentClass,
  useEnrollmentClassStudents,
  useEnrollmentTransferCandidates,
  useTransferEnrollmentStudent,
} from '../hooks/useEnrollment';
import { transferStudentSchema, type TransferStudentFormValues } from '../schemas';

export function EnrollmentClassDetailPage() {
  const params = useParams();
  const classPublicId = parseRouteParamPublicId(params.classPublicId);
  const [transferOpen, setTransferOpen] = useState(false);
  const classQuery = useEnrollmentClass(classPublicId);
  const studentsQuery = useEnrollmentClassStudents(classPublicId, { page: 1, limit: DEFAULT_PAGE_SIZE });
  const transferCandidatesQuery = useEnrollmentTransferCandidates(
    classPublicId,
    { page: 1, limit: 50 },
    transferOpen,
  );
  const transferStudent = useTransferEnrollmentStudent(classPublicId ?? '');
  const klass = classQuery.data;
  const students = studentsQuery.data?.data ?? [];

  async function handleTransfer(values: TransferStudentFormValues) {
    await transferStudent.mutateAsync(values.studentPublicId);
    setTransferOpen(false);
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        eyebrow="Enrollment"
        title={
          klass
            ? `${klass.program.code} · S${klass.currentSemester} · ${klass.section}`
            : 'Class detail'
        }
        description="Roster and student placement for this class."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link to={ROUTES.ENROLLMENT_CLASSES} />}>
              <ArrowLeft className="size-4" />
              Classes
            </Button>
            {klass?.permissions.canManageStudents ? (
              <Button type="button" onClick={() => setTransferOpen(true)}>
                <MoveRight className="size-4" />
                Transfer student
              </Button>
            ) : null}
          </div>
        }
      />

      <DataState
        isLoading={classQuery.isLoading}
        isError={classQuery.isError}
        error={classQuery.error}
        onRetry={() => void classQuery.refetch()}
        empty={!klass}
      >
        {klass ? (
          <div className="grid gap-3 md:grid-cols-4">
            <Info label="Department" value={klass.program.department.code} />
            <Info label="Admission" value={klass.admissionYear} />
            <Info label="Academic year" value={klass.academicYear} />
            <Info label="Students" value={klass._count.students} />
          </div>
        ) : null}
      </DataState>

      <DataState
        isLoading={studentsQuery.isLoading}
        isError={studentsQuery.isError}
        error={studentsQuery.error}
        onRetry={() => void studentsQuery.refetch()}
        empty={students.length === 0}
        emptyTitle="No students found"
        emptyDescription="Create or transfer students into this class."
      >
        <TableSurface title="Class students">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Roll number</th>
              <th className="px-4 py-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((student) => (
              <tr key={student.studentPublicId}>
                <td className="px-4 py-3 font-medium">{student.user.fullName}</td>
                <td className="px-4 py-3">{student.rollNumber}</td>
                <td className="px-4 py-3">{student.user.email}</td>
              </tr>
            ))}
          </tbody>
        </TableSurface>
      </DataState>

      {transferOpen && classPublicId ? (
        <TransferPanel
          candidates={transferCandidatesQuery.data?.data ?? []}
          isLoading={transferCandidatesQuery.isLoading}
          isPending={transferStudent.isPending}
          onCancel={() => setTransferOpen(false)}
          onSubmit={handleTransfer}
        />
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function TransferPanel({
  candidates,
  isLoading,
  isPending,
  onCancel,
  onSubmit,
}: {
  candidates: Array<{ studentPublicId: string; rollNumber: string; user: { fullName: string; email: string } }>;
  isLoading: boolean;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (values: TransferStudentFormValues) => Promise<void>;
}) {
  const form = useForm<TransferStudentFormValues>({
    resolver: zodResolver(transferStudentSchema),
    defaultValues: { studentPublicId: '' },
  });

  return (
    <form
      className="space-y-4 rounded-lg border bg-card p-4"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <FormField label="Student" error={form.formState.errors.studentPublicId?.message}>
        <select
          className={inputClassName}
          disabled={isPending || isLoading}
          {...form.register('studentPublicId')}
        >
          <option value="">{isLoading ? 'Loading students...' : 'Select student'}</option>
          {candidates.map((student) => (
            <option key={student.studentPublicId} value={student.studentPublicId}>
              {student.user.fullName} · {student.rollNumber}
            </option>
          ))}
        </select>
      </FormField>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || candidates.length === 0}>
          Transfer
        </Button>
      </div>
    </form>
  );
}
