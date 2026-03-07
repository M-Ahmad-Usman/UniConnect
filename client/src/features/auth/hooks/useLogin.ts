import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/api/endpoints/auth.api';
import { ROUTES } from '@/lib/constants';
import { connectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError, LoginRequest, LoginResponse } from '@/types';

export function useLogin() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation<LoginResponse, ApiError, LoginRequest>({
    mutationFn: authApi.login,
    meta: {
      suppressErrorToast: true,
    },
    onSuccess: (user) => {
      setUser(user);

      if (user.mustChangePassword) {
        toast.info('You must change your temporary password before continuing.');
        navigate(ROUTES.CHANGE_PASSWORD, { replace: true });
        return;
      }

      connectSocket();
      toast.success('Signed in successfully.');
      navigate(ROUTES.SERVERS, { replace: true });
    },
  });
}
