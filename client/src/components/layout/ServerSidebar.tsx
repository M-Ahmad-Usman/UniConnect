import { Plus, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';
import { useServers } from '@/features/servers/hooks/useServers';

interface ServerSidebarProps {
  activeServerId: number | null;
  onSelectServer?: () => void;
}

function getServerInitial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export function ServerSidebar({ activeServerId, onSelectServer }: ServerSidebarProps) {
  const user = useAuthStore((state) => state.user);
  const serversQuery = useServers();

  if (serversQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (serversQuery.isError) {
    return (
      <div className="px-2 py-4">
        <EmptyState
          icon={Shield}
          title="Servers unavailable"
          description="The server list could not be loaded right now."
          action={{ label: 'Retry', onClick: () => void serversQuery.refetch() }}
        />
      </div>
    );
  }

  const servers = serversQuery.data ?? [];

  if (servers.length === 0) {
    return (
      <div className="px-2 py-4">
        <EmptyState
          icon={Shield}
          title="No servers"
          description="You have not been added to any active server yet."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center justify-center border-b border-border text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        UC
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center gap-3 px-2 py-4">
          {servers.map((server) => (
            <Tooltip key={server.id}>
              <TooltipTrigger render={<div />}>
                <NavLink
                  to={ROUTES.SERVER(server.id)}
                  onClick={onSelectServer}
                  aria-label={server.name}
                  className={cn(
                    'group relative flex size-11 items-center justify-center rounded-2xl border border-transparent transition-all hover:-translate-y-0.5 hover:border-border hover:bg-accent',
                    activeServerId === server.id &&
                      'border-primary/30 bg-primary/10 text-primary shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]',
                  )}
                >
                  <span
                    className={cn(
                      'absolute -left-2 h-8 w-1 rounded-full bg-primary opacity-0 transition-opacity',
                      activeServerId === server.id && 'opacity-100',
                    )}
                    aria-hidden="true"
                  />
                  <Avatar>
                    <AvatarImage src={server.iconUrl ?? undefined} alt={server.name} />
                    <AvatarFallback>{getServerInitial(server.name)}</AvatarFallback>
                  </Avatar>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">{server.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </ScrollArea>
      {user?.userType === 'ADMIN' ? (
        <div className="flex justify-center border-t border-border px-2 py-3">
          <Tooltip>
            <TooltipTrigger render={<div />}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
                aria-disabled="true"
                className="rounded-2xl"
              >
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Server creation ships in a later module.</TooltipContent>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
}