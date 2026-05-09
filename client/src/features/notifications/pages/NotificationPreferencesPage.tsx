import { Bell, Hash, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/constants';
import { parseRouteParamId } from '@/lib/route-params';
import { NotificationScopeType, NotificationType, type UpdatePreferenceRequest } from '@/types';
import { useServerChannels } from '@/features/channels/hooks/useServerChannels';
import { useServerDetail } from '@/features/servers/hooks/useServerDetail';
import { SubscriptionToggle } from '../components/SubscriptionToggle';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { useUpdateNotificationPreference } from '../hooks/useUpdateNotificationPreference';
import {
  getPostChannelPreference,
  getPostServerPreference,
  getRoleServerPreference,
  isSubscribed,
} from '../utils';

function isSamePreference(
  left: UpdatePreferenceRequest | undefined,
  right: Omit<UpdatePreferenceRequest, 'isSubscribed'>,
) {
  return (
    left?.notificationType === right.notificationType &&
    left.scopeType === right.scopeType &&
    left.serverId === right.serverId &&
    (left.channelId ?? null) === (right.channelId ?? null)
  );
}

function isPendingPreference(
  pending: UpdatePreferenceRequest | undefined,
  target: Omit<UpdatePreferenceRequest, 'isSubscribed'>,
  isPending: boolean,
) {
  return isPending && isSamePreference(pending, target);
}

export function NotificationPreferencesPage() {
  const params = useParams();
  const serverId = parseRouteParamId(params.serverId);
  const serverQuery = useServerDetail(serverId);
  const channelsQuery = useServerChannels(serverId, false);
  const preferencesQuery = useNotificationPreferences(
    serverId ? { serverId } : undefined,
  );
  const updatePreference = useUpdateNotificationPreference();

  if (serverId === null) {
    return (
      <EmptyState
        icon={Bell}
        title="Choose a server"
        description="Notification preferences are configured per server."
        action={{ label: 'Browse servers', onClick: () => window.location.assign(ROUTES.SETTINGS_NOTIFICATIONS) }}
      />
    );
  }

  if (serverQuery.isLoading || channelsQuery.isLoading || preferencesQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (serverQuery.isError || channelsQuery.isError || preferencesQuery.isError) {
    return (
      <EmptyState
        icon={Bell}
        title="Notification settings unavailable"
        description="This server's notification preferences could not be loaded right now."
        action={{
          label: 'Retry',
          onClick: () => {
            void serverQuery.refetch();
            void channelsQuery.refetch();
            void preferencesQuery.refetch();
          },
        }}
      />
    );
  }

  const server = serverQuery.data;
  const channels = (channelsQuery.data ?? []).filter((channel) => !channel.isArchived);
  const preferences = preferencesQuery.data;
  const postServerPreference = getPostServerPreference(preferences, serverId);
  const roleServerPreference = getRoleServerPreference(preferences, serverId);
  const postServerSubscribed = isSubscribed(postServerPreference);
  const roleServerSubscribed = isSubscribed(roleServerPreference);

  const mutatePreference = (payload: UpdatePreferenceRequest) => {
    updatePreference.mutate(payload);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal">Notification settings</h1>
            {server ? <Badge variant="outline">{server.name}</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">
            Manage post and role notifications for this server.
          </p>
        </div>
        <Button variant="outline" render={<Link to={ROUTES.SETTINGS_NOTIFICATIONS} />}>
          Change server
        </Button>
      </div>

      <section className="rounded-lg border bg-background">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Post notifications</h2>
              <p className="text-muted-foreground text-sm">
                Server-level muting suppresses all post notifications from this server.
              </p>
            </div>
          </div>
          <SubscriptionToggle
            label="Post notifications for this server"
            checked={postServerSubscribed}
            isPending={isPendingPreference(
              updatePreference.variables,
              {
                notificationType: NotificationType.NEW_POST,
                scopeType: NotificationScopeType.SERVER,
                serverId,
              },
              updatePreference.isPending,
            )}
            onChange={(isSubscribedValue) =>
              mutatePreference({
                notificationType: NotificationType.NEW_POST,
                scopeType: NotificationScopeType.SERVER,
                serverId,
                isSubscribed: isSubscribedValue,
              })
            }
          />
        </div>
        <Separator />
        <div className="divide-y">
          {channels.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-sm">No visible channels in this server.</p>
          ) : (
            channels.map((channel) => {
              const preference = getPostChannelPreference(preferences, serverId, channel.id);
              const checked = isSubscribed(preference);

              return (
                <div key={channel.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Hash className="text-muted-foreground size-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{channel.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {postServerSubscribed ? 'Channel post notifications' : 'Disabled by server mute'}
                      </p>
                    </div>
                  </div>
                  <SubscriptionToggle
                    label={`Post notifications for ${channel.name}`}
                    checked={checked}
                    disabled={!postServerSubscribed}
                    isPending={isPendingPreference(
                      updatePreference.variables,
                      {
                        notificationType: NotificationType.NEW_POST,
                        scopeType: NotificationScopeType.CHANNEL,
                        serverId,
                        channelId: channel.id,
                      },
                      updatePreference.isPending,
                    )}
                    onChange={(isSubscribedValue) =>
                      mutatePreference({
                        notificationType: NotificationType.NEW_POST,
                        scopeType: NotificationScopeType.CHANNEL,
                        serverId,
                        channelId: channel.id,
                        isSubscribed: isSubscribedValue,
                      })
                    }
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-background">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldAlert className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Role notifications</h2>
              <p className="text-muted-foreground text-sm">
                Control notifications when a role is assigned to you in this server.
              </p>
            </div>
          </div>
          <SubscriptionToggle
            label="Role assignment notifications for this server"
            checked={roleServerSubscribed}
            isPending={isPendingPreference(
              updatePreference.variables,
              {
                notificationType: NotificationType.ROLE_ASSIGNED,
                scopeType: NotificationScopeType.SERVER,
                serverId,
              },
              updatePreference.isPending,
            )}
            onChange={(isSubscribedValue) =>
              mutatePreference({
                notificationType: NotificationType.ROLE_ASSIGNED,
                scopeType: NotificationScopeType.SERVER,
                serverId,
                isSubscribed: isSubscribedValue,
              })
            }
          />
        </div>
      </section>
    </div>
  );
}
