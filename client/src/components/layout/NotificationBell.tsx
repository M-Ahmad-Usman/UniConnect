import { useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useMarkAllNotificationsRead } from '@/features/notifications/hooks/useMarkAllNotificationsRead';
import { NotificationPanel } from '@/features/notifications/components/NotificationPanel';
import { getNotificationTarget } from '@/features/notifications/utils';
import { parseRouteParamPublicId } from '@/lib/route-params';
import type { Notification } from '@/types';

export function NotificationBell() {
  const navigate = useNavigate();
  const params = useParams();
  const serverPublicId = parseRouteParamPublicId(params.serverPublicId);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [open, setOpen] = useState(false);
  const unreadCountQuery = useUnreadCount();
  const previewQuery = useNotificationPreview(open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
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

  const handleOpenSettings = () => {
    setOpen(false);
    navigate(
      serverPublicId
        ? ROUTES.SERVER_NOTIFICATION_SETTINGS(serverPublicId)
        : ROUTES.SETTINGS_NOTIFICATIONS,
    );
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
          onMarkAllRead={() => markAllRead.mutate()}
          isMarkingAllRead={markAllRead.isPending}
          onViewAll={() => {
            setOpen(false);
            navigate(ROUTES.NOTIFICATIONS);
          }}
          onOpenSettings={handleOpenSettings}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
