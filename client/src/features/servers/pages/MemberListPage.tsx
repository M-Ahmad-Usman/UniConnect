import { ChevronLeft, ChevronRight, Users2 } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { parseRouteParamId } from '@/lib/route-params';
import { useServerDetail } from '@/features/servers/hooks/useServerDetail';
import { useServerMembers } from '@/features/servers/hooks/useServerMembers';
import { MemberCard } from '@/features/servers/components/MemberCard';

const PAGE_SIZE = 20;

function parsePageParam(raw: string | null) {
  if (!raw) {
    return 1;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function MemberListPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const serverId = parseRouteParamId(params.serverId);
  const page = parsePageParam(searchParams.get('page'));

  const serverQuery = useServerDetail(serverId);
  const membersQuery = useServerMembers(serverId, { page, limit: PAGE_SIZE });

  const members = membersQuery.data?.data ?? [];
  const pagination = membersQuery.data?.pagination;

  const pageSummary = useMemo(() => {
    if (!pagination || pagination.total === 0) {
      return 'No members to show';
    }

    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `Showing ${start}-${end} of ${pagination.total}`;
  }, [pagination]);

  function navigateToPage(nextPage: number) {
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage <= 1) {
      nextParams.delete('page');
    } else {
      nextParams.set('page', String(nextPage));
    }

    setSearchParams(nextParams, { replace: true });
  }

  if (serverId === null) {
    return (
      <EmptyState
        icon={Users2}
        title="Invalid server"
        description="The selected server could not be resolved from the current route."
      />
    );
  }

  if (serverQuery.isLoading || membersQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (serverQuery.isError || membersQuery.isError) {
    return (
      <EmptyState
        icon={Users2}
        title="Unable to load members"
        description="This member list could not be loaded right now."
        action={{
          label: 'Retry',
          onClick: () => {
            void serverQuery.refetch();
            void membersQuery.refetch();
          },
        }}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Roster</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Server members</h1>
            <p className="text-sm text-muted-foreground">
              {serverQuery.data?.name} · {pageSummary}
            </p>
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No members found"
          description="Members will appear here as soon as users join this server."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {members.map((member) => (
            <MemberCard key={`${member.userId}-${member.joinedAt}`} member={member} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/80 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => navigateToPage(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => navigateToPage(pagination.page + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
