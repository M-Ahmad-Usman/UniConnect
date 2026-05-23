import { useEffect, useRef, useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { StableAvatar } from '@/components/shared/StableAvatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MAX_FILE_SIZE } from '@/lib/constants';
import { getApiErrorMessage } from '@/features/auth/utils';
import { useUpdateServerIcon } from '../hooks/useUpdateServerIcon';

interface ServerIconUploadProps {
  serverId: number;
  serverName: string;
  iconUrl: string | null;
  canUpdate: boolean;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function getServerInitial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function validateServerIconFile(file: File) {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Only JPEG, PNG, and WEBP images are allowed.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'Server icon must be 5 MB or smaller.';
  }

  return null;
}

export function ServerIconUpload({
  serverId,
  serverName,
  iconUrl,
  canUpdate,
}: ServerIconUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateIcon = useUpdateServerIcon(serverId);

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  function clearSelection() {
    setSelectedFile(null);
    setError(null);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }

  function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const validationError = validateServerIconFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });
  }

  async function handleUpload() {
    if (!selectedFile) {
      return;
    }

    try {
      await updateIcon.mutateAsync(selectedFile);
      toast.success('Server icon updated.');
      clearSelection();
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError, 'Unable to upload server icon right now.'));
    }
  }

  return (
    <>
      <div className="relative inline-flex shrink-0">
        <StableAvatar
          src={iconUrl}
          alt={serverName}
          fallback={getServerInitial(serverName)}
          className="size-10 rounded-xl"
          imageClassName="rounded-xl"
          fallbackClassName="rounded-xl"
        />
        {canUpdate ? (
          <Button
            type="button"
            size="icon-sm"
            className="absolute -bottom-1 -right-1 size-6 rounded-full"
            aria-label="Update server icon"
            title="Update server icon"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-3.5" />
          </Button>
        ) : null}
      </div>
      {canUpdate ? (
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          className="sr-only"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      ) : null}
      <span className="sr-only" aria-live="polite">
        {error && !selectedFile ? error : ''}
      </span>

      <Dialog open={selectedFile !== null} onOpenChange={(open) => !open && clearSelection()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preview server icon</DialogTitle>
            <DialogDescription>
              JPEG, PNG, and WEBP images up to 5 MB are supported.
            </DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <div className="mx-auto overflow-hidden rounded-2xl border">
              <img
                src={previewUrl}
                alt="Selected server icon preview"
                className="size-44 object-cover"
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={clearSelection}
              disabled={updateIcon.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpload} disabled={updateIcon.isPending}>
              <Upload className="size-4" />
              {updateIcon.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
