import axios from 'axios';
import { ApiError } from '@/types/api.types';
import { useAuthStore } from '@/stores/auth.store';
import { queryClient } from '@/lib/query-client';
import { disconnectSocket } from '@/lib/socket';
import { ROUTES } from '@/lib/constants';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Response Interceptor: Unwrap success data ──────────────────────────────

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap { success: true, data } → return data directly
    if (response.data?.success === true && 'data' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // ─── 401 Unauthorized: Attempt token refresh ──────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await axios.post('/api/auth/refresh', null, { withCredentials: true });
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — logout
        useAuthStore.getState().clearUser();
        queryClient.clear();
        disconnectSocket();
        window.location.href = ROUTES.LOGIN;
        return Promise.reject(error);
      }
    }

    // ─── Normalize error into ApiError ────────────────────────────────────
    const apiError = new ApiError(
      error.response?.data?.error?.code ?? 'INTERNAL_ERROR',
      error.response?.data?.error?.message ?? 'An unexpected error occurred',
      error.response?.data?.error?.details ?? [],
      error.response?.status ?? 500,
    );

    return Promise.reject(apiError);
  },
);
