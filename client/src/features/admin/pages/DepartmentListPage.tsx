import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { useDepartments } from '../hooks/useDepartments';
import { useCreateDepartment, useUpdateDepartment } from '../hooks/useAcademicCatalog';
import { AdminPageHeader, DataState } from '../components/AdminDataPrimitives';
import { DepartmentDialog } from '../components/CatalogDialogs';
import type { DepartmentListItem } from '@/types';
import type { DepartmentFormValues } from '../schemas';

export function DepartmentListPage() {
  const departmentsQuery = useDepartments();
  const createDepartment = useCreateDepartment();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentListItem | null>(null);
  const updateDepartment = useUpdateDepartment(editing?.id ?? 0);

  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);

  async function handleCreate(values: DepartmentFormValues) {
    await createDepartment.mutateAsync(values);
  }

  async function handleUpdate(values: DepartmentFormValues) {
    if (!editing) return;
    await updateDepartment.mutateAsync(values);
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Departments"
        description="Manage academic departments and their linked department servers."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create department
          </Button>
        }
      />
      <div className="overflow-hidden rounded-lg border bg-background">
        <DataState
          isLoading={departmentsQuery.isLoading}
          isError={departmentsQuery.isError}
          error={departmentsQuery.error}
          onRetry={() => void departmentsQuery.refetch()}
          empty={departments.length === 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Server</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {departments.map((department) => (
                  <tr key={department.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{department.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{department.code}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={ROUTES.SERVER(department.serverPublicId)}
                        className="text-primary hover:underline"
                      >
                        Open server
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={ROUTES.ADMIN_DEPARTMENT(department.id)}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                            <Eye className="size-4" />
                            Open
                        </Link>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditing(department)}>
                          <Edit className="size-4" />
                          <span className="sr-only">Edit department</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </div>
      <DepartmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        loading={createDepartment.isPending}
        onSubmit={handleCreate}
      />
      <DepartmentDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        initial={editing ?? undefined}
        loading={updateDepartment.isPending}
        onSubmit={handleUpdate}
      />
    </section>
  );
}
