import { FileSpreadsheet, GraduationCap, UserPlus } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const enrollmentNavItems = [
  { label: 'Classes', to: ROUTES.ENROLLMENT_CLASSES, icon: GraduationCap },
  { label: 'New student', to: ROUTES.ENROLLMENT_STUDENT_NEW, icon: UserPlus },
  { label: 'Import', to: ROUTES.ENROLLMENT_IMPORT, icon: FileSpreadsheet },
];

export function EnrollmentLayout() {
  return (
    <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="rounded-lg border border-border bg-background p-3">
        <div className="px-2 pb-3">
          <p className="text-sm font-semibold">Enrollment</p>
          <p className="text-xs text-muted-foreground">Class and student placement.</p>
        </div>
        <nav className="grid gap-1">
          {enrollmentNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent',
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
