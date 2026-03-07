import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { useResetPassword } from '@/features/auth/hooks/useResetPassword';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/auth/schemas';
import { applyApiValidationErrors, getApiErrorMessage } from '@/features/auth/utils';
import { PasswordField } from './PasswordField';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

export function ResetPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const resetPassword = useResetPassword();
  const defaultValues = useMemo<ResetPasswordFormValues>(
    () => ({
      token,
      newPassword: '',
    }),
    [token],
  );
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues,
  });

  const password = useWatch({ control, name: 'newPassword' }) ?? '';
  const newPasswordField = register('newPassword');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await resetPassword.mutateAsync(values);
    } catch (error) {
      if (applyApiValidationErrors(error, setError)) {
        return;
      }

      setFormError(getApiErrorMessage(error, 'Unable to reset your password.'));
    }
  });

  if (!token) {
    return (
      <EmptyState
        icon={KeyRound}
        title="Invalid reset link"
        description="This reset link is missing its token or has already been cleaned from the URL."
        action={{
          label: 'Back to sign in',
          onClick: () => navigate(ROUTES.LOGIN),
        }}
      />
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <input type="hidden" {...register('token')} />

      <PasswordField
        id="reset-password-new"
        label="New password"
        placeholder="Create a strong password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        disabled={resetPassword.isPending}
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

      <Button className="h-10 w-full" disabled={resetPassword.isPending} type="submit">
        {resetPassword.isPending ? 'Resetting password...' : 'Reset password'}
      </Button>

      <Link className="block text-sm text-sky-300 transition hover:text-sky-200" to={ROUTES.LOGIN}>
        Back to sign in
      </Link>
    </form>
  );
}
