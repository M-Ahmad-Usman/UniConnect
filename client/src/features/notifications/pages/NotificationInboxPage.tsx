import { Bell, CheckCheck, Filter, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationType, type NotificationListParams } from '@/types';
import { useMarkAllNotificationsRead } from '../hooks/useMarkAllNotificationsRead';
import { useMarkNotificationRead } from '../hooks/useMarkNotificationRead';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from '../components/NotificationItem';
import { getNotificationTarget } from '../utils';

const PAGE_SIZE = 20;

function parsePage(value: string | null) {
  const page = Number(value ?? '1');
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseType(value: string | null) {
  if (value === NotificationType.NEW_POST || value === NotificationType.ROLE_ASSIGNED) {
    return value;
  }

  return undefined;
}

export function NotificationInboxPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const tab = searchParams.get('tab') === 'unread' ? 'unread' : 'all';
  const type = parseType(searchParams.get('type'));
  const page = parsePage(searchParams.get('page'));

  const params: NotificationListParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      unreadOnly: tab === 'unread' ? true : undefined,
      type,
    }),
    [page, tab, type],
  );
  const query = useNotifications(params);
  const notifications = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const updateFilter = (updates: { tab?: 'all' | 'unread'; type?: NotificationType | null; page?: number }) => {
    const next = new URLSearchParams(searchParams);

    if (updates.tab) {
      if (updates.tab === 'all') {
        next.delete('tab');
      } else {
        next.set('tab', updates.tab);
      }
    }

    if ('type' in updates) {
      if (updates.type) {
        next.set('type', updates.type);
      } else {
        next.delete('type');
      }
    }

    next.set('page', String(updates.page ?? 1));
    setSearchParams(next);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Notifications</h1>
          <p className="text-muted-foreground text-sm">Review posts and role updates across UniConnect.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || notifications.every((item) => item.readAt !== null)}
        >
          <CheckCheck className="size-4" />
          Mark all read
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="text-muted-foreground size-4" />
        <Button
          variant={tab === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => updateFilter({ tab: 'all' })}
        >
          All
        </Button>
        <Button
          variant={tab === 'unread' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => updateFilter({ tab: 'unread' })}
        >
          Unread
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant={!type ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => updateFilter({ type: null })}
        >
          Any type
        </Button>
        <Button
          variant={type === NotificationType.NEW_POST ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => updateFilter({ type: NotificationType.NEW_POST })}
        >
          Posts
        </Button>
        <Button
          variant={type === NotificationType.ROLE_ASSIGNED ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => updateFilter({ type: NotificationType.ROLE_ASSIGNED })}
        >
          Roles
        </Button>
        {pagination ? <Badge variant="outline">{pagination.total} total</Badge> : null}
      </div>

      <section className="overflow-hidden rounded-lg border bg-background">
        {query.isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="py-10">
            <Button variant="outline" onClick={() => void query.refetch()} className="mx-auto flex">
              <RotateCcw className="size-4" />
              Retry
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-2 px-4 text-center">
            <Bell className="text-muted-foreground size-12" />
            <h2 className="text-lg font-semibold">No notifications found</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              New post and role activity will appear here when it matches your filters.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-2">
                <NotificationItem
                  notification={notification}
                  onSelect={(item) => {
                    if (item.readAt === null) {
                      markRead.mutate(item.id);
                    }
                    navigate(getNotificationTarget(item));
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => updateFilter({ page: pagination.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => updateFilter({ page: pagination.page + 1 })}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
