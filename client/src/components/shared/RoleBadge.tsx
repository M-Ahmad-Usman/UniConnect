import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const roleStyles: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  HOD: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  hod: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  CR: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cr: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PRESIDENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  president: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  society_president: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  MODERATOR: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  server_moderator: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  channel_moderator: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  CONVENOR: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  convenor: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  society_convenor: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  program_director: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
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
  ADMIN: 'Admin',
};

interface RoleBadgeProps {
  role: string;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const style = roleStyles[role] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  const label = roleLabels[role] ?? role;

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', style, className)}>
      {label}
    </Badge>
  );
}
