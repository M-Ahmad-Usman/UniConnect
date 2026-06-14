import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateChannel } from '@/features/channels/hooks/useUpdateChannel';
import { updateChannelSchema, type UpdateChannelFormValues } from '@/features/channels/schemas';
import { applyApiValidationErrors, getApiErrorMessage } from '@/features/auth/utils';
import type { ChannelListItem } from '@/types';

interface EditChannelDialogProps {
  serverPublicId: string;
  channel: ChannelListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditChannelDialog({
  serverPublicId,
  channel,
  open,
  onOpenChange,
}: EditChannelDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const updateChannel = useUpdateChannel(serverPublicId);
  const {
    control,
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<UpdateChannelFormValues>({
    resolver: zodResolver(updateChannelSchema),
    defaultValues: {
      name: channel.name,
      description: channel.description ?? '',
    },
  });

  const description = useWatch({ control, name: 'description' });
  const descriptionLength = description?.length ?? 0;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setFormError(null);
    }

    onOpenChange(nextOpen);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      name: channel.name,
      description: channel.description ?? '',
    });
  }, [channel.description, channel.name, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await updateChannel.mutateAsync({
        channelPublicId: channel.publicId,
        payload: {
          name: values.name.trim(),
          description: values.description?.trim() ? values.description.trim() : undefined,
        },
      });

      toast.success('Channel updated successfully.');
      handleOpenChange(false);
    } catch (error) {
      if (applyApiValidationErrors(error, setError)) {
        return;
      }

      setFormError(getApiErrorMessage(error, 'Unable to update this channel right now.'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg border border-border/70 bg-card">
        <DialogHeader>
          <DialogTitle>Edit channel</DialogTitle>
          <DialogDescription>
            Refine the name and description to keep this channel easy to discover.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="edit-channel-name">Channel name</Label>
            <Input
              id="edit-channel-name"
              maxLength={100}
              disabled={updateChannel.isPending}
              aria-invalid={errors.name ? true : undefined}
              {...register('name')}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-channel-description">Description</Label>
              <span className="text-xs text-muted-foreground">{descriptionLength}/500</span>
            </div>
            <Textarea
              id="edit-channel-description"
              maxLength={500}
              disabled={updateChannel.isPending}
              aria-invalid={errors.description ? true : undefined}
              {...register('description')}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          {formError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          ) : null}

          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updateChannel.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateChannel.isPending}>
              {updateChannel.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
