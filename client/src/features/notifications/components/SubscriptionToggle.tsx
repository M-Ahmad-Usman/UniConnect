import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionToggleProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  isPending?: boolean;
}

export function SubscriptionToggle({
  checked,
  disabled,
  label,
  onChange,
  isPending,
}: SubscriptionToggleProps) {
  const [optimisticChecked, setOptimisticChecked] = useState(checked);
  const visibleChecked = isPending ? optimisticChecked : checked;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={visibleChecked}
      aria-label={label}
      disabled={disabled || isPending}
      onClick={() => {
        const next = !visibleChecked;
        setOptimisticChecked(next);
        onChange(next);
      }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        visibleChecked ? 'border-primary bg-primary' : 'border-border bg-muted',
        (disabled || isPending) && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        className={cn(
          'inline-flex size-5 items-center justify-center rounded-full bg-background shadow-sm transition-transform',
          visibleChecked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      >
        {isPending ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
      </span>
    </button>
  );
}
