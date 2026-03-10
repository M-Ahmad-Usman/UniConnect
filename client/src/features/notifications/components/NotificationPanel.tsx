import { Bell, CheckCheck, ChevronRight, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { NotificationType, type Notification, type PaginatedResponse } from '@/types';

interface NotificationPanelProps {
  notifications: PaginatedResponse<Notification> | undefined;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onSelectNotification: (notification: Notification) => void;
  onOpenSettings: () => void;
}

function getNotificationIcon(type: Notification['type']) {
  if (type === NotificationType.ROLE_ASSIGNED) {
    return ShieldAlert;
  }

  return Bell;
}

export function NotificationPanel({
  notifications,
  isLoading,
  isError,
  onRetry,
  onSelectNotification,
  onOpenSettings,
}: NotificationPanelProps) {
  const items = notifications?.data ?? [];

  return (
    <div className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-popover text-popover-foreground">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Notifications</h3>
          <p className="text-muted-foreground text-xs">Recent activity across your spaces.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
          <CheckCheck className="size-4" />
          Settings
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
            {items.map((notification) => {
              const Icon = getNotificationIcon(notification.type);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onSelectNotification(notification)}
                  className={cn(
                    'hover:bg-accent flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                    notification.readAt === null ? 'bg-accent/30' : 'bg-transparent',
                  )}
                >
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start gap-2">
                      <p
                        className={cn(
                          'line-clamp-1 text-sm',
                          notification.readAt === null ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {notification.title}
                      </p>
                      {notification.readAt === null ? (
                        <span
                          className="mt-1 size-2 shrink-0 rounded-full bg-sky-500"
                          aria-label="Unread notification"
                          role="img"
                        />
                      ) : null}
                    </div>
                    {notification.message ? (
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {notification.message}
                      </p>
                    ) : null}
                    <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                      <span>
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                      <ChevronRight className="size-3.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}