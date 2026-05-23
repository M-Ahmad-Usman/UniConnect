import { BookMarked, Hash, Layers3, Lock, Megaphone, Unlock, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Can } from '@/components/shared/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateChannelDialog } from '@/features/channels/components/CreateChannelDialog';
import { ChannelActions } from '@/features/channels/components/ChannelActions';
import { usePermissions } from '@/hooks/usePermissions';
import { ROUTES } from '@/lib/constants';
import { ChannelType, type ChannelListItem } from '@/types';

interface ChannelHeaderProps {
  serverId: number;
  channel: ChannelListItem;
}

function getChannelMeta(type: ChannelListItem['type']) {
  switch (type) {
    case ChannelType.ANNOUNCEMENT:
      return { icon: Megaphone, label: 'Announcement', tone: 'bg-amber-100 text-amber-900' };
    case ChannelType.COURSE:
      return { icon: BookMarked, label: 'Course', tone: 'bg-sky-100 text-sky-900' };
    case ChannelType.PROGRAM:
      return { icon: Layers3, label: 'Program', tone: 'bg-primary/10 text-primary' };
    case ChannelType.GENERAL:
    default:
      return { icon: Hash, label: 'General', tone: 'bg-slate-200 text-slate-900' };
  }
}

export function ChannelHeader({ serverId, channel }: ChannelHeaderProps) {
  const navigate = useNavigate();
  const permissions = usePermissions(serverId);
  const [createOpen, setCreateOpen] = useState(false);
  const meta = getChannelMeta(channel.type);
  const ChannelTypeIcon = meta.icon;

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card px-5 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{channel.name}</h1>
              <Badge className={meta.tone}>
                <ChannelTypeIcon className="mr-1 size-3.5" />
                {meta.label}
              </Badge>
              {channel.isLocked ? (
                <Badge variant="outline" className="gap-1">
                  <Lock className="size-3" />
                  Locked
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Unlock className="size-3" />
                  Unlocked
                </Badge>
              )}
            </div>

            <p className="max-w-3xl text-sm text-muted-foreground">
              {channel.description ??
                'Follow official updates, participate in channel discussions, and stay synced with your cohort.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Can when={permissions.canCreateChannels}>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                New channel
              </Button>
            </Can>
            <ChannelActions serverId={serverId} channel={channel} />
          </div>
        </div>
      </section>

      <CreateChannelDialog
        serverId={serverId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(channelId) => navigate(ROUTES.CHANNEL(serverId, channelId))}
      />
    </>
  );
}
