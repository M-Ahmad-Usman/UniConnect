import { useMemo, useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { ChannelSidebar } from '@/components/layout/ChannelSidebar';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { ServerSidebar } from '@/components/layout/ServerSidebar';
import { TopBar } from '@/components/layout/TopBar';
import { ROUTES } from '@/lib/constants';
import { parseRouteParamId } from '@/lib/route-params';

type DrawerView = 'servers' | 'channels';

export function AppShell() {
  const location = useLocation();
  const params = useParams();
  const serverId = parseRouteParamId(params.serverId);
  const channelId = parseRouteParamId(params.channelId);
  const isAdminRoute = location.pathname.startsWith(ROUTES.ADMIN);
  const isAcademicRoute = location.pathname.startsWith('/academics');
  const isWorkspaceRoute = isAdminRoute || isAcademicRoute;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<DrawerView>('servers');

  const drawerTitle = useMemo(() => {
    if (drawerView === 'channels' && serverId !== null) {
      return 'Channels';
    }

    return 'Servers';
  }, [drawerView, serverId]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {!isWorkspaceRoute ? (
        <aside className="hidden h-full w-20 shrink-0 lg:block">
          <ServerSidebar activeServerId={serverId} />
        </aside>
      ) : null}
      {!isWorkspaceRoute ? (
        <aside className="hidden h-full w-72 shrink-0 lg:block">
          <ChannelSidebar serverId={serverId} activeChannelId={channelId} />
        </aside>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar
          onOpenNavigation={() => {
            setDrawerView(serverId !== null ? 'channels' : 'servers');
            setDrawerOpen(true);
          }}
        />
        <main className="min-h-0 flex-1 overflow-auto bg-background px-4 py-4 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
      {!isWorkspaceRoute ? (
        <MobileDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={drawerTitle}
          showBackButton={drawerView === 'channels' && serverId !== null}
          onBack={() => setDrawerView('servers')}
        >
          {drawerView === 'servers' ? (
            <ServerSidebar
              activeServerId={serverId}
              variant="drawer"
              onSelectServer={() => {
                setDrawerView('channels');
              }}
            />
          ) : (
            <ChannelSidebar
              serverId={serverId}
              activeChannelId={channelId}
              onSelectChannel={() => setDrawerOpen(false)}
            />
          )}
        </MobileDrawer>
      ) : null}
    </div>
  );
}
