import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const roleStyles: Record<string, string> = {
  STAFF:
    'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  admin: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200',
  HOD: 'border-primary/25 bg-primary/10 text-primary',
  hod: 'border-primary/25 bg-primary/10 text-primary',
  CR: 'border-primary/25 bg-primary/10 text-primary',
  cr: 'border-primary/25 bg-primary/10 text-primary',
  PRESIDENT: 'border-primary/25 bg-primary/10 text-primary',
  president: 'border-primary/25 bg-primary/10 text-primary',
  society_president: 'border-primary/25 bg-primary/10 text-primary',
  MODERATOR:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  server_moderator:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  channel_moderator:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  CONVENOR: 'border-primary/25 bg-primary/10 text-primary',
  convenor: 'border-primary/25 bg-primary/10 text-primary',
  society_convenor: 'border-primary/25 bg-primary/10 text-primary',
  program_director: 'border-primary/25 bg-primary/10 text-primary',
};

const roleLabels: Record<string, string> = {
  hod: 'HOD',
  cr: 'CR',
  president: 'President',
  society_president: 'President',
  convenor: 'Convenor',
  society_convenor: 'Convenor',
  program_director: 'Director',
  server_moderator: 'Server Moderator',
  channel_moderator: 'Channel Moderator',
  STAFF: 'Staff',
  admin: 'Admin',
  enrollment_officer: 'Enrollment Officer',
};

interface RoleBadgeProps {
  role: string;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const style =
    roleStyles[role] ??
    'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
  const label = roleLabels[role] ?? role;

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', style, className)}>
      {label}
    </Badge>
  );
}
