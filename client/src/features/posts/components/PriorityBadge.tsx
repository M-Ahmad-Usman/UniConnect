import { AlertTriangle, Circle, Siren } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PostPriority, type PostPriority as PostPriorityType } from '@/types';
import { priorityLabels } from '../utils';

const priorityTone: Record<PostPriorityType, string> = {
  NORMAL: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  IMPORTANT:
    'border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  URGENT:
    'border-red-200 bg-red-100 text-red-900 shadow-sm shadow-red-500/10 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
};

interface PriorityBadgeProps {
  priority: PostPriorityType;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const Icon =
    priority === PostPriority.URGENT
      ? Siren
      : priority === PostPriority.IMPORTANT
        ? AlertTriangle
        : Circle;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 text-xs font-medium', priorityTone[priority], className)}
    >
      <Icon className={cn('size-3.5', priority === PostPriority.URGENT && 'animate-pulse')} />
      {priorityLabels[priority]}
    </Badge>
  );
}
