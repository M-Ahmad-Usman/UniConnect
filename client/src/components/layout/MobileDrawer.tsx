import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  children: ReactNode;
}

export function MobileDrawer({
  open,
  onOpenChange,
  title,
  showBackButton,
  onBack,
  children,
}: MobileDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal="trap-focus">
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex justify-start">
          <DialogPrimitive.Popup
            className={cn(
              'pointer-events-auto flex h-full w-[min(24rem,calc(100vw-1rem))] flex-col bg-background shadow-2xl outline-none',
              'data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left',
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div className="flex items-center gap-2">
                {showBackButton ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Back to servers"
                    onClick={onBack}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                ) : null}
                <div>
                  <DialogPrimitive.Title className="text-sm font-semibold">
                    {title}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-muted-foreground text-xs">
                    Navigate quickly across your workspace.
                  </DialogPrimitive.Description>
                </div>
              </div>
              <DialogPrimitive.Close
                render={<Button variant="ghost" size="icon-sm" aria-label="Close navigation" />}
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <div className="min-h-0 flex-1">{children}</div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
