import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
} as const;

export function LoadingSpinner({ fullPage, size = 'md', className }: LoadingSpinnerProps) {
  const spinner = (
    <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)} />
  );

  if (fullPage) {
    return <div className="flex min-h-screen items-center justify-center">{spinner}</div>;
  }

  return spinner;
}
