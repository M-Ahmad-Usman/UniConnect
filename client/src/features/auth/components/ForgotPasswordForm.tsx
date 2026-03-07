import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/lib/constants';
import { useForgotPassword } from '@/features/auth/hooks/useForgotPassword';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/schemas';
import { applyApiValidationErrors, getApiErrorMessage } from '@/features/auth/utils';

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await forgotPassword.mutateAsync(values);
      setIsSubmitted(true);
    } catch (error) {
      if (applyApiValidationErrors(error, setError)) {
        return;
      }

      setFormError(getApiErrorMessage(error, 'Unable to send a reset link right now.'));
    }
  });

  if (isSubmitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          If an account exists with that email address, a reset link has been sent.
        </div>
        <Link className="text-sm text-sky-300 transition hover:text-sky-200" to={ROUTES.LOGIN}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="forgot-password-email">Email</Label>
        <Input
          id="forgot-password-email"
          type="email"
          placeholder="name@ntu.edu.pk"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          disabled={forgotPassword.isPending}
          {...register('email')}
        />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>

      {formError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <Button className="h-10 w-full" disabled={forgotPassword.isPending} type="submit">
        {forgotPassword.isPending ? 'Sending link...' : 'Send reset link'}
      </Button>

      <Link className="block text-sm text-sky-300 transition hover:text-sky-200" to={ROUTES.LOGIN}>
        Back to sign in
      </Link>
    </form>
  );
}
