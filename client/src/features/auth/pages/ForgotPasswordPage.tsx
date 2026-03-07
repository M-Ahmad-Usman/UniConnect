import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email address and we will send a reset link if an account exists."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
