import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Edit3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { applyApiValidationErrors, getApiErrorMessage } from '@/features/auth/utils';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { updateProfileSchema, type UpdateProfileFormValues } from '../schemas';

interface BioEditorProps {
  bio: string | null;
}

export function BioEditor({ bio }: BioEditorProps) {
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const updateProfile = useUpdateProfile();
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { bio: bio ?? '' },
  });
  const bioValue = useWatch({ control, name: 'bio' }) ?? '';

  useEffect(() => {
    if (!editing) {
      reset({ bio: bio ?? '' });
    }
  }, [bio, editing, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateProfile.mutateAsync({ bio: values.bio?.trim() || undefined });
      toast.success('Profile updated.');
      setEditing(false);
    } catch (error) {
      if (applyApiValidationErrors(error, setError)) {
        return;
      }
      setFormError(getApiErrorMessage(error, 'Unable to update profile right now.'));
    }
  });

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Bio</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit3 className="size-4" />
            Edit
          </Button>
        </div>
        <p className="max-h-40 min-h-20 overflow-y-auto break-words rounded-lg border bg-background p-3 text-sm whitespace-pre-wrap text-muted-foreground">
          {bio?.trim() || 'No bio added yet.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="profile-bio" className="text-base font-semibold">
          Bio
        </Label>
        <span className="text-xs text-muted-foreground">{bioValue.length}/500</span>
      </div>
      <Textarea
        id="profile-bio"
        rows={5}
        maxLength={500}
        disabled={updateProfile.isPending}
        aria-invalid={errors.bio ? true : undefined}
        {...register('bio')}
      />
      {errors.bio ? <p className="text-sm text-destructive">{errors.bio.message}</p> : null}
      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={updateProfile.isPending}
          onClick={() => {
            reset({ bio: bio ?? '' });
            setFormError(null);
            setEditing(false);
          }}
        >
          <X className="size-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving...' : 'Save bio'}
        </Button>
      </div>
    </form>
  );
}
