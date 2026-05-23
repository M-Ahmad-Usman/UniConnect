import { startTransition, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Menu, Search } from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useServerDetail } from '@/features/servers/hooks/useServerDetail';
import { useServerChannels } from '@/features/channels/hooks/useServerChannels';
import { parseSearchParam } from '@/features/posts/utils';
import { parseRouteParamId } from '@/lib/route-params';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
  const isAcademicRoute = location.pathname.startsWith('/academics');
  const isWorkspaceRoute = isAdminRoute || isAcademicRoute;
  const isChannelRoute = serverId !== null && channelId !== null && !isWorkspaceRoute;
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
          {!isWorkspaceRoute ? (
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
          <button
            type="button"
            onClick={() => navigate(ROUTES.SERVERS)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold tracking-tight transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              !isWorkspaceRoute && 'lg:hidden',
            )}
            aria-label="Go to UniConnect home"
          >
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-border bg-white p-0.5">
              <img src="/logo.svg" alt="" className="size-full object-contain" />
            </span>
            <span className="hidden sm:inline">UniConnect</span>
          </button>
          <div className="hidden min-w-0 md:block">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              {isAdminRoute || isAcademicRoute ? (
                <>
                  <span>{isAdminRoute ? 'Admin' : 'Academics'}</span>
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
                  {serverQuery.data ? (
                    <span className="truncate">{serverQuery.data.name}</span>
                  ) : null}
                  {activeChannel ? <span className="text-muted-foreground">/</span> : null}
                  {activeChannel ? <span className="truncate">{activeChannel.name}</span> : null}
                </>
              )}
            </div>
            <p className="text-muted-foreground line-clamp-1 text-xs">
              {isWorkspaceRoute
                ? isAdminRoute
                  ? 'System administration and catalog maintenance.'
                  : 'Delegated academic class operations.'
                : hasNavigationError
                  ? 'Some workspace details failed to load. You can still navigate and retry by refreshing.'
                  : (activeChannel?.description ??
                    serverQuery.data?.description ??
                    'Navigate across servers and channels.')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasNavigationError && !isWorkspaceRoute ? (
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
          <ThemeToggle />
          <NotificationBell />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
