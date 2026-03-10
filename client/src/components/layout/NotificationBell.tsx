import { useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/lib/constants';
import { useNotificationStore } from '@/stores/notification.store';
import { useNotificationPreview } from '@/features/notifications/hooks/useNotificationPreview';
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount';
import { useMarkNotificationRead } from '@/features/notifications/hooks/useMarkNotificationRead';
import { NotificationPanel } from '@/features/notifications/components/NotificationPanel';
import type { Notification } from '@/types';

function getNotificationTarget(notification: Notification) {
  if (notification.type === 'ROLE_ASSIGNED') {
    return ROUTES.PROFILE;
  }

  const serverId = notification.post?.channel.serverId;
  const channelId = notification.post?.channelId;

  if (serverId && channelId) {
    return ROUTES.CHANNEL(serverId, channelId);
  }

  return ROUTES.SETTINGS_NOTIFICATIONS;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [open, setOpen] = useState(false);
  const unreadCountQuery = useUnreadCount();
  const previewQuery = useNotificationPreview(open);
  const markRead = useMarkNotificationRead();
  const showPulse = useMemo(() => unreadCount > 0, [unreadCount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void unreadCountQuery.refetch();
  }, [open, unreadCountQuery]);

  const handleSelectNotification = (notification: Notification) => {
    if (notification.readAt === null) {
      markRead.mutate(notification.id);
    }

    setOpen(false);
    navigate(getNotificationTarget(notification));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" aria-label="Notifications" />}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span
            className={showPulse ? 'absolute -right-0.5 -top-0.5 flex size-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white' : 'absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white'}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-auto min-w-0 p-0">
        <NotificationPanel
          notifications={previewQuery.data}
          isLoading={previewQuery.isLoading}
          isError={previewQuery.isError}
          onRetry={() => void previewQuery.refetch()}
          onSelectNotification={handleSelectNotification}
          onOpenSettings={() => {
            setOpen(false);
            navigate(ROUTES.SETTINGS_NOTIFICATIONS);
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}