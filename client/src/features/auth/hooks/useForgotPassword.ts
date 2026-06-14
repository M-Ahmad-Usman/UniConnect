import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints/auth.api';
import type { ApiError, ForgotPasswordRequest } from '@/types';

export function useForgotPassword() {
  return useMutation<Record<string, never>, ApiError, ForgotPasswordRequest>({
    mutationFn: authApi.forgotPassword,
    meta: {
      suppressErrorToast: true,
    },
  });
}
