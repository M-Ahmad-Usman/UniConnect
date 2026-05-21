import axios, { type InternalAxiosRequestConfig } from 'axios';
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

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const CSRF_EXCLUDED_PATHS = new Set(['/auth/csrf']);
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _csrfRetry?: boolean;
};

let csrfRequest: Promise<string> | null = null;

function shouldAttemptRefresh(status: number | undefined, requestUrl: string | undefined) {
  if (status !== 401 || !requestUrl) {
    return false;
  }

  return !AUTH_REFRESH_EXCLUDED_PATHS.has(requestUrl);
}

function isUnsafeMethod(method: string | undefined) {
  return method ? UNSAFE_METHODS.has(method.toLowerCase()) : false;
}

function readCookie(name: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${name}=`;
  return (
    document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

async function fetchCsrfToken() {
  const response = await axios.get('/api/auth/csrf', { withCredentials: true });
  const token = response.data?.success === true ? response.data.data?.token : undefined;

  if (typeof token !== 'string' || token.length === 0) {
    throw new ApiError('CSRF_INVALID', 'Unable to initialize request protection.', [], 403);
  }

  return token;
}

async function ensureCsrfToken(forceRefresh = false) {
  const existing = forceRefresh ? null : readCookie(CSRF_COOKIE_NAME);
  if (existing) {
    return existing;
  }

  csrfRequest ??= fetchCsrfToken().finally(() => {
    csrfRequest = null;
  });

  return csrfRequest;
}

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Attach CSRF Token For Unsafe Methods ─────────────

apiClient.interceptors.request.use(async (config) => {
  if (
    isUnsafeMethod(config.method) &&
    config.url &&
    !CSRF_EXCLUDED_PATHS.has(config.url) &&
    !config.headers.has(CSRF_HEADER_NAME)
  ) {
    const token = await ensureCsrfToken();
    config.headers.set(CSRF_HEADER_NAME, token);
  }

  return config;
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
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      originalRequest &&
      error.response?.data?.error?.code === 'CSRF_INVALID' &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      const token = await ensureCsrfToken(true);
      originalRequest.headers.set(CSRF_HEADER_NAME, token);
      return apiClient(originalRequest);
    }

    // ─── 401 Unauthorized: Attempt token refresh ──────────────────────────
    if (
      originalRequest &&
      shouldAttemptRefresh(error.response?.status, originalRequest.url) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const token = await ensureCsrfToken();
        await axios.post('/api/auth/refresh', null, {
          withCredentials: true,
          headers: { [CSRF_HEADER_NAME]: token },
        });
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
