import { useState } from 'react';
import { Edit, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCreateDiscipline, useDisciplines, useUpdateDiscipline } from '../hooks/useAcademicCatalog';
import { AdminPageHeader, DataState } from '../components/AdminDataPrimitives';
import { DisciplineDialog } from '../components/CatalogDialogs';
import type { Discipline } from '@/types';
import type { DisciplineFormValues } from '../schemas';

export function DisciplineListPage() {
  const disciplinesQuery = useDisciplines();
  const createDiscipline = useCreateDiscipline();
  const updateDiscipline = useUpdateDiscipline();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Discipline | null>(null);
  const disciplines = disciplinesQuery.data ?? [];

  async function handleCreate(values: DisciplineFormValues) {
    await createDiscipline.mutateAsync(values);
  }

  async function handleUpdate(values: DisciplineFormValues) {
    if (!editing) return;
    await updateDiscipline.mutateAsync({ id: editing.id, name: values.name });
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Disciplines"
        description="Maintain discipline names used to compose academic programs."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create discipline
          </Button>
        }
      />
      <div className="rounded-lg border bg-background p-4">
        <DataState
          isLoading={disciplinesQuery.isLoading}
          isError={disciplinesQuery.isError}
          error={disciplinesQuery.error}
          onRetry={() => void disciplinesQuery.refetch()}
          empty={disciplines.length === 0}
        >
          <div className="flex flex-wrap gap-2">
            {disciplines.map((discipline) => (
              <button
                key={discipline.id}
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setEditing(discipline)}
              >
                <Badge variant="secondary">{discipline.name}</Badge>
                <Edit className="size-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DataState>
      </div>
      <DisciplineDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        loading={createDiscipline.isPending}
        onSubmit={handleCreate}
      />
      <DisciplineDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        initial={editing ?? undefined}
        loading={updateDiscipline.isPending}
        onSubmit={handleUpdate}
      />
    </section>
  );
}
