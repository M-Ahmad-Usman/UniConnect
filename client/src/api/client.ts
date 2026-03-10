import axios from 'axios';
import { ApiError } from '@/types/api.types';
import { useAuthStore } from '@/stores/auth.store';
import { queryClient } from '@/lib/query-client';
import { disconnectSocket } from '@/lib/socket';
import { ROUTES } from '@/lib/constants';

const AUTH_REFRESH_EXCLUDED_PATHS = new Set([
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
]);

function shouldAttemptRefresh(status: number | undefined, requestUrl: string | undefined) {
  if (status !== 401 || !requestUrl) {
    return false;
  }

  return !AUTH_REFRESH_EXCLUDED_PATHS.has(requestUrl);
}

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
    // Unwrap standard payloads while preserving pagination metadata.
    if (response.data?.success === true && 'data' in response.data) {
      if ('pagination' in response.data) {
        return {
          ...response,
          data: {
            data: response.data.data,
            pagination: response.data.pagination,
          },
        };
      }

      return { ...response, data: response.data.data };
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // ─── 401 Unauthorized: Attempt token refresh ──────────────────────────
    if (
      originalRequest &&
      shouldAttemptRefresh(error.response?.status, originalRequest.url) &&
      !originalRequest._retry
    ) {
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
