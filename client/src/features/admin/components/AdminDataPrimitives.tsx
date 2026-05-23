import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
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
        {description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        ) : null}
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
  emptyTitle = 'No records found',
  emptyDescription = 'Adjust filters or create a record.',
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  empty: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="py-10" role="status" aria-live="polite" aria-label="Loading data">
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
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
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
    <nav
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3"
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
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
    </nav>
  );
}

export function FormField({
  label,
  error,
  description,
  htmlFor,
  children,
  className,
}: {
  label: string;
  error?: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  const generatedId = useId();
  const fieldId = htmlFor ?? `field-${generatedId}`;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: (children.props as { id?: string }).id ?? fieldId,
        'aria-describedby':
          [(children.props as { 'aria-describedby'?: string })['aria-describedby'], describedBy]
            .filter(Boolean)
            .join(' ') || undefined,
        'aria-invalid':
          (children.props as { 'aria-invalid'?: string })['aria-invalid'] ??
          (error ? 'true' : undefined),
      })
    : children;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
      </label>
      {description ? (
        <span id={descriptionId} className="block text-xs text-muted-foreground">
          {description}
        </span>
      ) : null}
      {control}
      {error ? (
        <span id={errorId} className="block text-sm text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function TableSurface({
  title,
  description,
  tableClassName,
  children,
  className,
}: {
  title: string;
  description?: string;
  tableClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border bg-background', className)}>
      <table className={cn('w-full text-sm', tableClassName)}>
        <caption className="sr-only">
          {title}
          {description ? `. ${description}` : ''}
        </caption>
        {children}
      </table>
    </div>
  );
}

export const inputClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/20';
