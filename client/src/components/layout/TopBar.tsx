import { startTransition, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Menu, Search } from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/constants';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useServerDetail } from '@/features/servers/hooks/useServerDetail';
import { useServerChannels } from '@/features/channels/hooks/useServerChannels';
import { parseSearchParam } from '@/features/posts/utils';
import { parseRouteParamId } from '@/lib/route-params';
import { NotificationBell } from './NotificationBell';
import { UserDropdown } from './UserDropdown';

interface TopBarProps {
  onOpenNavigation: () => void;
}

export function TopBar({ onOpenNavigation }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const serverId = parseRouteParamId(params.serverId);
  const channelId = parseRouteParamId(params.channelId);
  const isAdminRoute = location.pathname.startsWith(ROUTES.ADMIN);
  const isChannelRoute = serverId !== null && channelId !== null && !isAdminRoute;
  const serverQuery = useServerDetail(serverId);
  const channelQuery = useServerChannels(serverId, false);
  const searchParamValue = parseSearchParam(searchParams.get('search'));
  const [searchInput, setSearchInput] = useState(() => searchParamValue);
  const debouncedSearchInput = useDebouncedValue(searchInput, 500);

  useEffect(() => {
    setSearchInput(searchParamValue);
  }, [searchParamValue]);

  useEffect(() => {
    if (!isChannelRoute) {
      return;
    }

    const nextValue = parseSearchParam(debouncedSearchInput);
    const currentValue = parseSearchParam(searchParams.get('search'));

    if (nextValue === currentValue) {
      return;
    }

    startTransition(() => {
      const nextSearchParams = new URLSearchParams(searchParams);
      if (nextValue.length === 0) {
        nextSearchParams.delete('search');
      } else {
        nextSearchParams.set('search', nextValue);
      }

      setSearchParams(nextSearchParams, { replace: true });
    });
  }, [debouncedSearchInput, isChannelRoute, searchParams, setSearchParams]);

  const activeChannel = useMemo(
    () => channelQuery.data?.find((channel) => channel.id === channelId) ?? null,
    [channelId, channelQuery.data],
  );
  const hasNavigationError = serverQuery.isError || channelQuery.isError;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {!isAdminRoute ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={onOpenNavigation}
            >
              <Menu className="size-4" />
            </Button>
          ) : null}
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              {isAdminRoute ? (
                <>
                  <span>Admin</span>
                  <Badge variant="outline">Workspace</Badge>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.SERVERS)}
                    className="hover:text-foreground text-muted-foreground transition-colors"
                  >
                    Servers
                  </button>
                  {serverQuery.data ? <span className="text-muted-foreground">/</span> : null}
                  {serverQuery.data ? <span className="truncate">{serverQuery.data.name}</span> : null}
                  {activeChannel ? <span className="text-muted-foreground">/</span> : null}
                  {activeChannel ? <span className="truncate">{activeChannel.name}</span> : null}
                </>
              )}
            </div>
            <p className="text-muted-foreground line-clamp-1 text-xs">
              {isAdminRoute
                ? 'System administration and catalog maintenance.'
                : hasNavigationError
                  ? 'Some workspace details failed to load. You can still navigate and retry by refreshing.'
                  : activeChannel?.description ??
                    serverQuery.data?.description ??
                    'Navigate across servers and channels.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasNavigationError && !isAdminRoute ? (
            <Badge variant="outline" className="hidden gap-1 md:inline-flex">
              <AlertCircle className="size-3.5" />
              Partial data unavailable
            </Badge>
          ) : null}
          <div className="relative hidden md:block">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              disabled={!isChannelRoute}
              placeholder={
                isChannelRoute ? 'Search posts in this channel' : 'Open a channel to search posts'
              }
              className="w-72 pl-9"
            />
          </div>
          <NotificationBell />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
