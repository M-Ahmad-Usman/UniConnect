import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useChangePassword } from '@/features/auth/hooks/useChangePassword';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/features/auth/schemas';
import { applyApiValidationErrors, getApiErrorMessage } from '@/features/auth/utils';
import { PasswordField } from './PasswordField';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

interface ChangePasswordFormProps {
  variant: 'forced' | 'voluntary';
}

export function ChangePasswordForm({ variant }: ChangePasswordFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const changePassword = useChangePassword();
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  const password = useWatch({ control, name: 'newPassword' }) ?? '';
  const currentPasswordField = register('currentPassword');
  const newPasswordField = register('newPassword');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await changePassword.mutateAsync(values);
    } catch (error) {
      if (applyApiValidationErrors(error, setError)) {
        return;
      }

      setFormError(getApiErrorMessage(error, 'Unable to change your password.'));
    }
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      {variant === 'forced' ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          You must change your temporary password before you can continue using UniConnect.
        </div>
      ) : null}

      <PasswordField
        id={`${variant}-current-password`}
        label="Current password"
        placeholder="Enter your current password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        disabled={changePassword.isPending}
        name={currentPasswordField.name}
        onBlur={currentPasswordField.onBlur}
        onChange={currentPasswordField.onChange}
        inputRef={currentPasswordField.ref}
      />

      <PasswordField
        id={`${variant}-new-password`}
        label="New password"
        placeholder="Create a strong password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        disabled={changePassword.isPending}
        name={newPasswordField.name}
        onBlur={newPasswordField.onBlur}
        onChange={newPasswordField.onChange}
        inputRef={newPasswordField.ref}
      />

      <PasswordStrengthIndicator password={password} />

      {formError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <Button className="h-10 w-full" disabled={changePassword.isPending} type="submit">
        {changePassword.isPending ? 'Updating password...' : 'Update password'}
      </Button>
    </form>
  );
}
