import { Bell, ChevronRight, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { NotificationType, type Notification } from '@/types';

interface NotificationItemProps {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}

function getNotificationIcon(type: Notification['type']) {
  if (type === NotificationType.ROLE_ASSIGNED) {
    return ShieldAlert;
  }

  return Bell;
}

export function NotificationItem({ notification, onSelect }: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.type);
  const isUnread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        'hover:bg-accent flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors',
        isUnread ? 'bg-accent/30' : 'bg-transparent',
      )}
    >
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <p className={cn('line-clamp-1 text-sm', isUnread ? 'font-semibold' : 'font-medium')}>
            {notification.title}
          </p>
          {isUnread ? (
            <span
              className="mt-1 size-2 shrink-0 rounded-full bg-sky-500"
              aria-label="Unread notification"
              role="img"
            />
          ) : null}
        </div>
        {notification.message ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">{notification.message}</p>
        ) : null}
        <div className="text-muted-foreground flex items-center justify-between text-[11px]">
          <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
          <ChevronRight className="size-3.5" />
        </div>
      </div>
    </button>
  );
}
