import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/endpoints/auth.api';
import { ROUTES } from '@/lib/constants';
import { queryClient } from '@/lib/query-client';
import { disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types';

export function useLogout() {
  const navigate = useNavigate();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation<Record<string, never>, ApiError, void>({
    mutationFn: authApi.logout,
    meta: {
      suppressErrorToast: true,
    },
    onSettled: () => {
      clearUser();
      disconnectSocket();
      queryClient.clear();
      navigate(ROUTES.LOGIN, { replace: true });
    },
  });
}
