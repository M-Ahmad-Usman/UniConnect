import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const dashboardCards = [
  {
    title: 'Navigation shell ready',
    description: 'Admin navigation is now available inside the authenticated shell.',
  },
  {
    title: 'CRUD modules pending',
    description: 'User, catalog, and role management screens will land in the next admin-focused modules.',
  },
  {
    title: 'Current focus',
    description: 'Module 2 establishes layout, route flow, and safe placeholders for future admin actions.',
  },
];

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Administration</p>
        <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          This workspace now has the correct admin shell and route structure. Data-heavy CRUD pages will plug into this layout next.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {dashboardCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle className="text-base">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}