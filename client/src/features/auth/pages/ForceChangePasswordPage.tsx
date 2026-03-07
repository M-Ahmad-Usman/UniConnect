import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm';

export function ForceChangePasswordPage() {
  return (
    <AuthLayout
      title="Change temporary password"
      subtitle="Your account needs a new password before you can access the rest of the application."
    >
      <ChangePasswordForm variant="forced" />
    </AuthLayout>
  );
}
