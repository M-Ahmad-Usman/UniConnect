import { Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StableAvatar } from '@/components/shared/StableAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { useServers } from '@/features/servers/hooks/useServers';

interface ServerSidebarProps {
  activeServerPublicId: string | null;
  onSelectServer?: () => void;
  variant?: 'rail' | 'drawer';
}

function getServerInitial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export function ServerSidebar({
  activeServerPublicId,
  onSelectServer,
  variant = 'rail',
}: ServerSidebarProps) {
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
    <div
      className={cn(
        'flex h-full flex-col bg-sidebar',
        variant === 'rail' && 'border-r border-border',
      )}
    >
      <div className="flex h-16 items-center justify-center border-b border-border">
        <Tooltip>
          <TooltipTrigger render={<div />}>
            <NavLink
              to={ROUTES.SERVERS}
              aria-label="Go to UniConnect home"
              onClick={onSelectServer}
              className="flex size-12 items-center justify-center rounded-xl transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img src="/logo.svg" alt="" className="size-10 object-contain" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">UniConnect home</TooltipContent>
        </Tooltip>
      </div>
      <ScrollArea className="flex-1">
        {variant === 'drawer' ? (
          <div className="grid gap-2 p-3">
            {servers.map((server) => (
              <NavLink
                key={server.publicId}
                to={ROUTES.SERVER(server.publicId)}
                onClick={onSelectServer}
                aria-label={server.name}
                className={cn(
                  'flex min-w-0 items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  activeServerPublicId === server.publicId &&
                    'border-primary/30 bg-primary/10 text-primary shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_18%,transparent)]',
                )}
              >
                <StableAvatar
                  src={server.iconUrl}
                  alt={server.name}
                  fallback={getServerInitial(server.name)}
                  className="size-12 rounded-2xl"
                  imageClassName="rounded-2xl"
                  fallbackClassName="rounded-2xl text-base"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{server.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {server.description ?? server.type.replace('_', ' ')}
                  </span>
                </span>
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-2 py-4">
            {servers.map((server) => (
              <Tooltip key={server.publicId}>
                <TooltipTrigger render={<div />}>
                  <NavLink
                    to={ROUTES.SERVER(server.publicId)}
                    onClick={onSelectServer}
                    aria-label={server.name}
                    className={cn(
                      'group relative flex size-14 items-center justify-center rounded-2xl border border-transparent transition-all hover:-translate-y-0.5 hover:border-border hover:bg-accent',
                      activeServerPublicId === server.publicId &&
                        'border-primary/30 bg-primary/10 text-primary shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute -left-2 h-9 w-1 rounded-full bg-primary opacity-0 transition-opacity',
                        activeServerPublicId === server.publicId && 'opacity-100',
                      )}
                      aria-hidden="true"
                    />
                    <StableAvatar
                      src={server.iconUrl}
                      alt={server.name}
                      fallback={getServerInitial(server.name)}
                      className="size-10 rounded-2xl"
                      imageClassName="rounded-2xl"
                      fallbackClassName="rounded-2xl"
                    />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">{server.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
