import { ArrowRight, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StableAvatar } from '@/components/shared/StableAvatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/lib/constants';
import { useServers } from '@/features/servers/hooks/useServers';

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export function ServersPage() {
  const navigate = useNavigate();
  const serversQuery = useServers();

  if (serversQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (serversQuery.isError) {
    return (
      <EmptyState
        icon={Shield}
        title="Unable to load servers"
        description="The workspace list could not be loaded right now."
        action={{ label: 'Retry', onClick: () => void serversQuery.refetch() }}
      />
    );
  }

  const servers = serversQuery.data ?? [];

  if (servers.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="No servers available"
        description="Your workspace will appear here as soon as a department, class, or society membership is active."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Your workspace</p>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a server</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Each server groups official announcements, class communication, and channel-specific
          updates.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {servers.map((server) => (
          <Card key={server.publicId} className="border-border/80 bg-card/90">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-lg">{server.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {server.type.replace('_', ' ')}
                  {server.class?.status === 'GRADUATED' ? (
                    <Badge variant="outline">Graduated</Badge>
                  ) : null}
                </CardDescription>
              </div>
              <StableAvatar
                src={server.iconUrl}
                alt={server.name}
                fallback={getInitial(server.name)}
                className="size-16 rounded-2xl"
                imageClassName="rounded-2xl"
                fallbackClassName="rounded-2xl text-lg"
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground min-h-10 text-sm">
                {server.description ??
                  'Open this server to browse its channels and recent activity.'}
              </p>
              <Button
                onClick={() => navigate(ROUTES.SERVER(server.publicId))}
                className="w-full justify-between"
              >
                Open server
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
