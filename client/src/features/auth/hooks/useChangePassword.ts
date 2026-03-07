import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/api/endpoints/auth.api';
import { ROUTES } from '@/lib/constants';
import { queryClient } from '@/lib/query-client';
import { disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError, ChangePasswordRequest } from '@/types';

export function useChangePassword() {
  const navigate = useNavigate();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation<Record<string, never>, ApiError, ChangePasswordRequest>({
    mutationFn: authApi.changePassword,
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: () => {
      clearUser();
      disconnectSocket();
      queryClient.clear();
      toast.success('Password changed. Please sign in again.');
      navigate(ROUTES.LOGIN, { replace: true });
    },
  });
}
