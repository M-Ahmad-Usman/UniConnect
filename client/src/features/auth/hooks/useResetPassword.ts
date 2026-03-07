import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/api/endpoints/auth.api';
import { ROUTES } from '@/lib/constants';
import type { ApiError, ResetPasswordRequest } from '@/types';

export function useResetPassword() {
  const navigate = useNavigate();

  return useMutation<Record<string, never>, ApiError, ResetPasswordRequest>({
    mutationFn: authApi.resetPassword,
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: () => {
      toast.success('Password reset successful. Please sign in with your new password.');
      navigate(ROUTES.LOGIN, { replace: true });
    },
  });
}
