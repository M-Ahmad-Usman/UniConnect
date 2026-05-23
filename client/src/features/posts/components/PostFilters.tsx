import { useState } from 'react';
import { CalendarDays, FilterX, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface FilterFieldsProps {
  idPrefix: string;
  priority?: PostPriorityType;
  startDate?: string;
  endDate?: string;
  onPriorityChange: (priority?: PostPriorityType) => void;
  onStartDateChange: (value?: string) => void;
  onEndDateChange: (value?: string) => void;
}

function FilterFields({
  idPrefix,
  priority,
  startDate,
  endDate,
  onPriorityChange,
  onStartDateChange,
  onEndDateChange,
}: FilterFieldsProps) {
  return (
    <div className="grid flex-1 gap-3 md:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-priority`}>Priority</Label>
        <select
          id={`${idPrefix}-priority`}
          value={priority ?? ''}
          onChange={(event) =>
            onPriorityChange(
              event.target.value ? (event.target.value as PostPriorityType) : undefined,
            )
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
        <Label htmlFor={`${idPrefix}-start-date`}>From</Label>
        <Input
          id={`${idPrefix}-start-date`}
          type="date"
          value={startDate ?? ''}
          onChange={(event) => onStartDateChange(event.target.value || undefined)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-end-date`}>To</Label>
        <Input
          id={`${idPrefix}-end-date`}
          type="date"
          value={endDate ?? ''}
          onChange={(event) => onEndDateChange(event.target.value || undefined)}
        />
      </div>
    </div>
  );
}

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasFilters = Boolean(priority || startDate || endDate);
  const activeFilterCount = [priority, startDate, endDate].filter(Boolean).length;

  return (
    <>
      <div className="rounded-lg border bg-background p-2 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setMobileOpen(true)}>
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" />
            Showing {resultCount} of {totalCount}
          </span>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear filters"
              onClick={onClear}
            >
              <FilterX className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="w-[min(92vw,24rem)] !max-w-none gap-0 overflow-hidden p-0 sm:!max-w-none">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" />
              Filter posts
            </DialogTitle>
            <DialogDescription>Refine posts by priority and date range.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-4 py-4">
            <FilterFields
              idPrefix="mobile-post-filter"
              priority={priority}
              startDate={startDate}
              endDate={endDate}
              onPriorityChange={onPriorityChange}
              onStartDateChange={onStartDateChange}
              onEndDateChange={onEndDateChange}
            />
          </div>
          <DialogFooter className="!mx-0 !mb-0 rounded-none border-t px-4 py-3">
            <Button type="button" variant="outline" disabled={!hasFilters} onClick={onClear}>
              <FilterX className="size-4" />
              Clear
            </Button>
            <Button type="button" onClick={() => setMobileOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="hidden rounded-lg border bg-background p-3 md:block">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <FilterFields
            idPrefix="post-filter"
            priority={priority}
            startDate={startDate}
            endDate={endDate}
            onPriorityChange={onPriorityChange}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />
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
    </>
  );
}
