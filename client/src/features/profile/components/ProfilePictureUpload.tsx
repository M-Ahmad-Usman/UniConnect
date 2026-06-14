import { useEffect, useRef, useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/features/auth/utils';
import { cn } from '@/lib/utils';
import { useUpdateProfilePicture } from '../hooks/useUpdateProfilePicture';
import { validateProfilePictureFile } from '../schemas';

interface ProfilePictureUploadProps {
  fullName: string;
  profilePictureUrl: string | null;
  size?: 'default' | 'large';
}

export function ProfilePictureUpload({
  fullName,
  profilePictureUrl,
  size = 'default',
}: ProfilePictureUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updatePicture = useUpdateProfilePicture();

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

    const validationError = validateProfilePictureFile(file);
    setError(validationError);
    if (validationError) {
      clearSelection();
      return;
    }

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
      await updatePicture.mutateAsync(selectedFile);
      toast.success('Profile picture updated.');
      clearSelection();
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError, 'Unable to upload profile picture right now.'));
    }
  }

  return (
    <>
      <div className="relative inline-flex">
        <UserAvatar
          fullName={fullName}
          profilePictureUrl={profilePictureUrl}
          className={cn(size === 'large' ? 'size-32 text-3xl' : 'size-20 text-xl')}
          fallbackClassName={size === 'large' ? 'text-3xl' : 'text-xl'}
        />
        <Button
          type="button"
          size="icon"
          className="absolute bottom-1 right-1 rounded-full"
          aria-label="Upload profile picture"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" />
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      {error && !selectedFile ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <Dialog open={selectedFile !== null} onOpenChange={(open) => !open && clearSelection()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preview profile picture</DialogTitle>
            <DialogDescription>
              JPEG, PNG, and WEBP images up to 5 MB are supported.
            </DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <div className="mx-auto overflow-hidden rounded-full border">
              <img
                src={previewUrl}
                alt="Selected profile preview"
                className="size-48 object-cover"
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={clearSelection}
              disabled={updatePicture.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpload} disabled={updatePicture.isPending}>
              <Upload className="size-4" />
              {updatePicture.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
