import { Bell, ChevronRight, Server } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/constants';
import { useServers } from '@/features/servers/hooks/useServers';

export function NotificationSettingsServerPickerPage() {
  const serversQuery = useServers();
  const servers = serversQuery.data ?? [];

  if (serversQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <Skeleton className="h-10 w-80" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (serversQuery.isError) {
    return (
      <EmptyState
        icon={Bell}
        title="Servers unavailable"
        description="Your server list could not be loaded right now."
        action={{ label: 'Retry', onClick: () => void serversQuery.refetch() }}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Notification settings</h1>
        <p className="text-muted-foreground text-sm">
          Choose a server to manage post and role notification preferences.
        </p>
      </div>

      {servers.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No servers available"
          description="You do not have any active servers with notification settings yet."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-background">
          {servers.map((server) => (
            <Button
              key={server.id}
              variant="ghost"
              className="h-auto w-full justify-between rounded-none border-b px-4 py-4 last:border-b-0"
              render={<Link to={ROUTES.SERVER_NOTIFICATION_SETTINGS(server.id)} />}
            >
              <span className="flex min-w-0 items-center gap-3 text-left">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Server className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{server.name}</span>
                  <span className="text-muted-foreground block text-xs">{server.type}</span>
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
