import { Bell, CheckCheck, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Notification, PaginatedResponse } from '@/types';
import { NotificationItem } from './NotificationItem';

interface NotificationPanelProps {
  notifications: PaginatedResponse<Notification> | undefined;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onSelectNotification: (notification: Notification) => void;
  onMarkAllRead: () => void;
  onViewAll: () => void;
  onOpenSettings: () => void;
  isMarkingAllRead?: boolean;
}

export function NotificationPanel({
  notifications,
  isLoading,
  isError,
  onRetry,
  onSelectNotification,
  onMarkAllRead,
  onViewAll,
  onOpenSettings,
  isMarkingAllRead,
}: NotificationPanelProps) {
  const items = notifications?.data ?? [];
  const hasUnread = items.some((notification) => notification.readAt === null);

  return (
    <div className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-popover text-popover-foreground">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Notifications</h3>
          <p className="text-muted-foreground text-xs">Recent activity across your spaces.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkAllRead}
          disabled={!hasUnread || isMarkingAllRead}
        >
          <CheckCheck className="size-4" />
          Mark read
        </Button>
      </div>
      <Separator />
      <ScrollArea className="max-h-96">
        {isLoading ? (
          <div className="space-y-3 px-4 py-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-border/60 p-3">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
            <ShieldAlert className="text-muted-foreground size-10" />
            <p className="text-sm font-medium">Notifications unavailable</p>
            <p className="text-muted-foreground max-w-xs text-xs">
              Recent activity could not be loaded right now.
            </p>
            {onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <Bell className="text-muted-foreground size-10" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-muted-foreground max-w-xs text-xs">
              New posts and role updates will appear here as soon as they arrive.
            </p>
          </div>
        ) : (
          <div className="p-2">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={onSelectNotification}
              />
            ))}
          </div>
        )}
      </ScrollArea>
      <Separator />
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          View all
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
          <SlidersHorizontal className="size-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
