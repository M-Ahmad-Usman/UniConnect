import { BookOpen, GraduationCap } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

const academicNavItems = [
  { label: 'Classes', to: ROUTES.ACADEMICS_CLASSES, icon: GraduationCap },
];

export function AcademicLayout() {
  return (
    <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="rounded-lg border border-border bg-background p-3">
        <div className="px-2 pb-3">
          <p className="text-sm font-semibold">Academic workspace</p>
          <p className="text-muted-foreground text-xs">Delegated class and curriculum operations.</p>
        </div>
        <nav className="grid gap-1">
          {academicNavItems.map((item) => {
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
          <span className="text-muted-foreground mt-2 flex items-center gap-2 px-3 py-2 text-xs">
            <BookOpen className="size-3.5" />
            Curriculum opens from a program or class.
          </span>
        </nav>
      </aside>
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
