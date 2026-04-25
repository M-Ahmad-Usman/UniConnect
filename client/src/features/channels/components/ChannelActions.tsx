import { MoreHorizontal, PencilLine, Trash2, UnlockKeyhole, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteChannel } from '@/features/channels/hooks/useDeleteChannel';
import { useLockChannel } from '@/features/channels/hooks/useLockChannel';
import { useUnlockChannel } from '@/features/channels/hooks/useUnlockChannel';
import { EditChannelDialog } from '@/features/channels/components/EditChannelDialog';
import { getApiErrorMessage } from '@/features/auth/utils';
import { ROUTES } from '@/lib/constants';
import { usePermissions } from '@/hooks/usePermissions';
import type { ChannelListItem } from '@/types';

interface ChannelActionsProps {
  serverId: number;
  channel: ChannelListItem;
}

export function ChannelActions({ serverId, channel }: ChannelActionsProps) {
  const navigate = useNavigate();
  const permissions = usePermissions(serverId);
  const lockChannel = useLockChannel(serverId);
  const unlockChannel = useUnlockChannel(serverId);
  const deleteChannel = useDeleteChannel(serverId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const pending = lockChannel.isPending || unlockChannel.isPending || deleteChannel.isPending;
  const canEdit = permissions.canEditChannels;
  const canLock = permissions.canLockChannels;
  const canDelete = permissions.canDeleteChannels && !channel.isAutoCreated;

  async function handleToggleLock() {
    try {
      if (channel.isLocked) {
        await unlockChannel.mutateAsync(channel.id);
        toast.success('Channel unlocked successfully.');
        return;
      }

      await lockChannel.mutateAsync(channel.id);
      toast.success('Channel locked successfully.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update channel lock state right now.'));
    }
  }

  async function handleDelete() {
    try {
      await deleteChannel.mutateAsync(channel.id);
      toast.success('Channel deleted successfully.');
      navigate(ROUTES.SERVER(serverId), { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to delete this channel right now.'));
    }
  }

  if (!canEdit && !canLock && !canDelete) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="outline" size="icon-sm" aria-label="Open channel actions" />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-48">
          <DropdownMenuItem disabled={!canEdit || pending} onClick={() => setEditOpen(true)}>
            <PencilLine className="size-4" />
            Edit channel
          </DropdownMenuItem>

          <DropdownMenuItem disabled={!canLock || pending} onClick={() => void handleToggleLock()}>
            {channel.isLocked ? <UnlockKeyhole className="size-4" /> : <LockKeyhole className="size-4" />}
            {channel.isLocked ? 'Unlock channel' : 'Lock channel'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            disabled={!canDelete || pending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete channel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditChannelDialog
        serverId={serverId}
        channel={channel}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete channel"
        description={
          channel.isAutoCreated
            ? 'Auto-created channels cannot be deleted.'
            : `Delete #${channel.name}? This action cannot be undone.`
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
