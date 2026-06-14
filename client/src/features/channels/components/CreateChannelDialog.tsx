import { useState } from 'react';
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
import { useCreateChannel } from '@/features/channels/hooks/useCreateChannel';
import { createChannelSchema, type CreateChannelFormValues } from '@/features/channels/schemas';
import { applyApiValidationErrors, getApiErrorMessage } from '@/features/auth/utils';

interface CreateChannelDialogProps {
  serverPublicId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (channelPublicId: string) => void;
}

export function CreateChannelDialog({
  serverPublicId,
  open,
  onOpenChange,
  onCreated,
}: CreateChannelDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const createChannel = useCreateChannel(serverPublicId);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateChannelFormValues>({
    resolver: zodResolver(createChannelSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const description = useWatch({ control, name: 'description' });
  const descriptionLength = description?.length ?? 0;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset({ name: '', description: '' });
      setFormError(null);
    }

    onOpenChange(nextOpen);
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const channel = await createChannel.mutateAsync({
        name: values.name.trim(),
        description: values.description?.trim() ? values.description.trim() : undefined,
      });

      toast.success('Channel created successfully.');
      handleOpenChange(false);
      onCreated?.(channel.publicId);
      reset({ name: '', description: '' });
    } catch (error) {
      if (applyApiValidationErrors(error, setError)) {
        return;
      }

      setFormError(getApiErrorMessage(error, 'Unable to create channel right now.'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg border border-border/70 bg-card">
        <DialogHeader>
          <DialogTitle>Create a new channel</DialogTitle>
          <DialogDescription>
            Add a focused space for conversations, announcements, or course activity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="create-channel-name">Channel name</Label>
            <Input
              id="create-channel-name"
              maxLength={100}
              placeholder="e.g. semester-updates"
              disabled={createChannel.isPending}
              aria-invalid={errors.name ? true : undefined}
              {...register('name')}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="create-channel-description">Description</Label>
              <span className="text-xs text-muted-foreground">{descriptionLength}/500</span>
            </div>
            <Textarea
              id="create-channel-description"
              maxLength={500}
              placeholder="Tell members what this channel is for..."
              disabled={createChannel.isPending}
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
              disabled={createChannel.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createChannel.isPending}>
              {createChannel.isPending ? 'Creating...' : 'Create channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
