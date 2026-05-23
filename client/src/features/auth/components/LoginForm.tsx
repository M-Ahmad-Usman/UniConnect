import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/lib/constants';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas';
import { applyApiValidationErrors, getApiErrorMessage } from '@/features/auth/utils';
import { PasswordField } from './PasswordField';

export function LoginForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const passwordField = register('password');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await login.mutateAsync(values);
    } catch (error) {
      if (applyApiValidationErrors(error, setError)) {
        return;
      }

      setFormError(getApiErrorMessage(error, 'Unable to sign in right now.'));
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="name@ntu.edu.pk"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          disabled={login.isPending}
          {...register('email')}
        />
        {errors.email ? (
          <p id="login-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <PasswordField
        id="login-password"
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        error={errors.password?.message}
        disabled={login.isPending}
        name={passwordField.name}
        onBlur={passwordField.onBlur}
        onChange={passwordField.onChange}
        inputRef={passwordField.ref}
      />

      {formError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <div className="flex items-center justify-end pt-1">
        <Link
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          to={ROUTES.FORGOT_PASSWORD}
        >
          Forgot password?
        </Link>
      </div>

      <Button className="h-10 w-full" disabled={login.isPending} type="submit">
        {login.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {login.isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}
