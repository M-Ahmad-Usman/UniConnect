import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { LoginForm } from '@/features/auth/components/LoginForm';

export function LoginPage() {
  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Sign in to continue into your university workspace."
    >
      <LoginForm />
    </AuthLayout>
  );
}
