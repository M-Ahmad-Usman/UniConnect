import { Outlet } from 'react-router-dom';
import { Building2, LayoutDashboard, Shield, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

const adminNavItems = [
  { label: 'Dashboard', to: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard },
  { label: 'Users', to: ROUTES.ADMIN_USERS, icon: Users },
  { label: 'Departments', to: ROUTES.ADMIN_DEPARTMENTS, icon: Building2 },
  { label: 'Disciplines', to: ROUTES.ADMIN_DISCIPLINES, icon: Shield },
];

export function AdminLayout() {
  return (
    <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="rounded-lg border border-border bg-background p-3">
        <div className="px-2 pb-3">
          <p className="text-sm font-semibold">Admin navigation</p>
          <p className="text-muted-foreground text-xs">
            Academic operations and system management.
          </p>
        </div>
        <nav className="grid gap-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'hover:bg-accent flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
