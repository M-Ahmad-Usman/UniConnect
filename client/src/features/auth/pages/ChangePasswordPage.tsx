import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm';

export function ChangePasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
      <Card className="w-full py-0">
        <CardHeader className="border-b px-6 py-6">
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Update your current password. You will be signed out after the change is completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <ChangePasswordForm variant="voluntary" />
        </CardContent>
      </Card>
    </div>
  );
}
