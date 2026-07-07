import { Activity, BookOpenText, Server, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAdminStats } from '../hooks/useAdminStats';
import { AdminPageHeader } from '../components/AdminDataPrimitives';

export function AdminDashboardPage() {
  const statsQuery = useAdminStats();

  if (statsQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <EmptyState
        icon={Activity}
        title="Dashboard unavailable"
        description="Could not load system statistics."
        action={{ label: 'Retry', onClick: () => void statsQuery.refetch() }}
      />
    );
  }

  const { users, servers, posts } = statsQuery.data;

  const cards = [
    {
      title: 'Total users',
      value: users.total,
      icon: Users,
      detail: `${users.admins} admin · ${users.staff} staff · ${users.teachers} teachers · ${users.students} students`,
    },
    {
      title: 'Active users',
      value: users.active,
      icon: Activity,
      detail: `${Math.max(users.total - users.active, 0)} inactive accounts`,
    },
    {
      title: 'Servers',
      value: servers.total,
      icon: Server,
      detail: `${servers.department} departments · ${servers.class} classes · ${servers.society} societies`,
    },
    {
      title: 'Posts',
      value: posts.total,
      icon: BookOpenText,
      detail: 'Non-deleted announcements and posts',
    },
  ];

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Admin dashboard"
        description="System-wide operational snapshot for users, servers, and communication activity."
        actions={
          <Button type="button" variant="outline" onClick={() => void statsQuery.refetch()}>
            <Activity className="size-4" />
            Refresh
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title} size="sm">
              <CardHeader className="grid-cols-[1fr_auto] items-center">
                <CardTitle className="text-sm text-muted-foreground">{card.title}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-3xl font-semibold tabular-nums">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
