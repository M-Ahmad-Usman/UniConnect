import { useState } from 'react';
import { ExternalLink, ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PostAttachment } from '@/types';
import { formatFileSize } from '../utils';

interface AttachmentPreviewProps {
  attachments: PostAttachment[];
}

export function AttachmentPreview({ attachments }: AttachmentPreviewProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<PostAttachment | null>(null);

  if (attachments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {attachments.map((attachment) => (
          <button
            key={attachment.id}
            type="button"
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted text-left"
            onClick={() => setSelectedAttachment(attachment)}
          >
            <img
              src={attachment.fileUrl}
              alt=""
              className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/55 px-2 py-1 text-xs text-white">
              <span className="inline-flex min-w-0 items-center gap-1">
                <ImageIcon className="size-3.5 shrink-0" />
                <span className="truncate">{formatFileSize(attachment.fileSize)}</span>
              </span>
              <ExternalLink className="size-3.5 shrink-0 opacity-80" />
            </span>
          </button>
        ))}
      </div>

      <Dialog open={selectedAttachment !== null} onOpenChange={(open) => !open && setSelectedAttachment(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Attachment preview</DialogTitle>
            <DialogDescription>
              {selectedAttachment ? formatFileSize(selectedAttachment.fileSize) : null}
            </DialogDescription>
          </DialogHeader>
          {selectedAttachment ? (
            <div className="flex max-h-[76vh] items-center justify-center bg-black/95">
              <img
                src={selectedAttachment.fileUrl}
                alt="Post attachment"
                className="max-h-[76vh] max-w-full object-contain"
              />
            </div>
          ) : null}
          {selectedAttachment ? (
            <div className="flex justify-end border-t bg-background px-4 py-3">
              <a
                href={selectedAttachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <ExternalLink className="size-4" />
                Open original
              </a>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
