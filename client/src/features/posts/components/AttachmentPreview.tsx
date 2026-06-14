import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon, Maximize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PostAttachment } from '@/types';
import { formatFileSize } from '../utils';

interface AttachmentPreviewProps {
  attachments: PostAttachment[];
  compact?: boolean;
}

function getThumbnailUrl(fileUrl: string) {
  const uploadMarker = '/image/upload/';
  if (!fileUrl.includes(uploadMarker)) {
    return fileUrl;
  }

  return fileUrl.replace(uploadMarker, `${uploadMarker}c_fill,w_320,h_320,q_auto,f_auto/`);
}

export function AttachmentPreview({ attachments, compact = false }: AttachmentPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedAttachment = selectedIndex !== null ? (attachments[selectedIndex] ?? null) : null;
  const hasMultipleAttachments = attachments.length > 1;

  if (attachments.length === 0) {
    return null;
  }

  function showPrevious() {
    setSelectedIndex((current) => {
      if (current === null) {
        return current;
      }

      return current === 0 ? attachments.length - 1 : current - 1;
    });
  }

  function showNext() {
    setSelectedIndex((current) => {
      if (current === null) {
        return current;
      }

      return current === attachments.length - 1 ? 0 : current + 1;
    });
  }

  return (
    <>
      <div
        className={cn(
          'grid gap-2',
          attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3',
          compact ? 'max-w-sm' : 'max-w-2xl',
        )}
      >
        {attachments.map((attachment, index) => (
          <button
            key={attachment.id}
            type="button"
            className={cn(
              'group relative overflow-hidden rounded-lg border border-border bg-muted text-left',
              compact ? 'size-28 sm:size-32' : 'aspect-[4/3] min-h-32',
            )}
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={getThumbnailUrl(attachment.fileUrl)}
              alt="Post attachment thumbnail"
              className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/55 px-2 py-1 text-xs text-white">
              <span className="inline-flex min-w-0 items-center gap-1">
                <ImageIcon className="size-3.5 shrink-0" />
                <span className="truncate">{formatFileSize(attachment.fileSize)}</span>
              </span>
              <Maximize2 className="size-3.5 shrink-0 opacity-80" />
            </span>
          </button>
        ))}
      </div>

      <Dialog
        open={selectedAttachment !== null}
        onOpenChange={(open) => !open && setSelectedIndex(null)}
      >
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen !max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden !rounded-none p-0 sm:!max-w-none">
          <DialogHeader className="border-b bg-background/95 px-4 py-3 pr-12">
            <DialogTitle>Attachment preview</DialogTitle>
            <DialogDescription>
              {selectedAttachment ? (
                <>
                  {hasMultipleAttachments && selectedIndex !== null
                    ? `${selectedIndex + 1} of ${attachments.length} · `
                    : null}
                  {formatFileSize(selectedAttachment.fileSize)}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {selectedAttachment ? (
            <div className="relative flex min-h-0 items-center justify-center bg-black">
              {hasMultipleAttachments ? (
                <button
                  type="button"
                  className="absolute left-3 top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Show previous attachment"
                  onClick={showPrevious}
                >
                  <ChevronLeft className="size-5" />
                </button>
              ) : null}
              <img
                src={selectedAttachment.fileUrl}
                alt="Post attachment"
                className="max-h-full max-w-full object-contain"
              />
              {hasMultipleAttachments ? (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Show next attachment"
                  onClick={showNext}
                >
                  <ChevronRight className="size-5" />
                </button>
              ) : null}
            </div>
          ) : null}
          {hasMultipleAttachments && selectedIndex !== null ? (
            <div className="flex items-center gap-2 overflow-x-auto border-t bg-background px-4 py-3">
              {attachments.map((attachment, index) => (
                <button
                  key={attachment.id}
                  type="button"
                  className={cn(
                    'size-10 shrink-0 overflow-hidden rounded-md border bg-muted transition',
                    index === selectedIndex
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border opacity-75 hover:opacity-100',
                  )}
                  aria-label={`Show attachment ${index + 1}`}
                  aria-current={index === selectedIndex ? 'true' : undefined}
                  onClick={() => setSelectedIndex(index)}
                >
                  <img
                    src={getThumbnailUrl(attachment.fileUrl)}
                    alt=""
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
