import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { PaginationMeta } from '@/types';
import { cn } from '@/lib/utils';

export function AdminPageHeader({
  eyebrow = 'Administration',
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        {description ? <p className="max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function DataState({
  isLoading,
  isError,
  onRetry,
  empty,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  empty: boolean;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="py-10">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={RotateCcw}
        title="Could not load data"
        description="Refresh the request and try again."
        action={{ label: 'Retry', onClick: onRetry }}
      />
    );
  }

  if (empty) {
    return <EmptyState title="No records found" description="Adjust filters or create a record." />;
  }

  return children;
}

export function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination?: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  if (!pagination) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total} records
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function FormField({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('space-y-1.5', className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-sm text-destructive">{error}</span> : null}
    </label>
  );
}

export const inputClassName =
  'h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';
