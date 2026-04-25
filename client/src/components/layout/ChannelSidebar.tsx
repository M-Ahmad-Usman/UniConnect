import { Hash, Lock, Plus, Users2 } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { CreateChannelDialog } from '@/features/channels/components/CreateChannelDialog';
import { groupChannels } from '@/features/channels/utils';
import { useServerChannels } from '@/features/channels/hooks/useServerChannels';
import { useServerDetail } from '@/features/servers/hooks/useServerDetail';
import { usePermissions } from '@/hooks/usePermissions';

interface ChannelSidebarProps {
  serverId: number | null;
  activeChannelId: number | null;
  onSelectChannel?: () => void;
}

export function ChannelSidebar({ serverId, activeChannelId, onSelectChannel }: ChannelSidebarProps) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const permissions = usePermissions(serverId);
  const serverQuery = useServerDetail(serverId);
  const channelQuery = useServerChannels(serverId, true);

  if (serverId === null) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Select a server to browse its channels.
      </div>
    );
  }

  if (serverQuery.isLoading || channelQuery.isLoading) {
    return (
      <div className="space-y-4 px-4 py-5">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Separator />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (serverQuery.isError || channelQuery.isError) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          icon={Hash}
          title="Channels unavailable"
          description="This server could not be loaded right now."
          action={{
            label: 'Retry',
            onClick: () => {
              void serverQuery.refetch();
              void channelQuery.refetch();
            },
          }}
        />
      </div>
    );
  }

  const server = serverQuery.data;
  const channels = (channelQuery.data ?? []).filter((channel) => !channel.isArchived);
  const groupedChannels = groupChannels(channels);

  return (
    <>
      <div className="flex h-full flex-col border-r border-border bg-background/85">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{server?.name ?? 'Server'}</h2>
            <p className="text-muted-foreground truncate text-xs">
              {server?._count.memberships ?? 0} members · {channels.length} channels
            </p>
            <NavLink
              to={ROUTES.MEMBERS(serverId)}
              onClick={onSelectChannel}
              className={({ isActive }) =>
                cn(
                  'mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                  isActive
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <Users2 className="size-3.5" />
              Members
            </NavLink>
          </div>
          {permissions.canCreateChannels ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Create channel"
              title="Create channel"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
            </Button>
          ) : null}
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-6 px-3 py-4">
            {groupedChannels.map((group) => (
              <section key={group.key} className="space-y-2">
                <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.channels.map((channel) => (
                    <NavLink
                      key={channel.id}
                      to={ROUTES.CHANNEL(serverId, channel.id)}
                      onClick={onSelectChannel}
                      className={cn(
                        'hover:bg-accent flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
                        activeChannelId === channel.id
                          ? 'bg-accent text-foreground font-medium'
                          : 'text-muted-foreground',
                      )}
                    >
                      <Hash className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{channel.name}</span>
                      {channel.isLocked ? <Lock className="size-3.5 shrink-0" /> : null}
                    </NavLink>
                  ))}
                </div>
              </section>
            ))}
            {groupedChannels.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">No visible channels in this server.</p>
            ) : null}
          </div>
        </ScrollArea>
      </div>
      {serverId !== null ? (
        <CreateChannelDialog
          serverId={serverId}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(channelId) => navigate(ROUTES.CHANNEL(serverId, channelId))}
        />
      ) : null}
    </>
  );
}
