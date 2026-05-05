import { CalendarDays, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PostPriority, type PostPriority as PostPriorityType } from '@/types';
import { priorityLabels } from '../utils';

interface PostFiltersProps {
  priority?: PostPriorityType;
  startDate?: string;
  endDate?: string;
  resultCount: number;
  totalCount: number;
  onPriorityChange: (priority?: PostPriorityType) => void;
  onStartDateChange: (value?: string) => void;
  onEndDateChange: (value?: string) => void;
  onClear: () => void;
}

const priorityOptions = [PostPriority.NORMAL, PostPriority.IMPORTANT, PostPriority.URGENT] as const;

export function PostFilters({
  priority,
  startDate,
  endDate,
  resultCount,
  totalCount,
  onPriorityChange,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: PostFiltersProps) {
  const hasFilters = Boolean(priority || startDate || endDate);

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="post-priority-filter">Priority</Label>
            <select
              id="post-priority-filter"
              value={priority ?? ''}
              onChange={(event) =>
                onPriorityChange(event.target.value ? (event.target.value as PostPriorityType) : undefined)
              }
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">All priorities</option>
              {priorityOptions.map((item) => (
                <option key={item} value={item}>
                  {priorityLabels[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="post-start-date">From</Label>
            <Input
              id="post-start-date"
              type="date"
              value={startDate ?? ''}
              onChange={(event) => onStartDateChange(event.target.value || undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="post-end-date">To</Label>
            <Input
              id="post-end-date"
              type="date"
              value={endDate ?? ''}
              onChange={(event) => onEndDateChange(event.target.value || undefined)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 xl:justify-end">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            Showing {resultCount} of {totalCount}
          </span>
          <Button type="button" variant="outline" disabled={!hasFilters} onClick={onClear}>
            <FilterX className="size-4" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
