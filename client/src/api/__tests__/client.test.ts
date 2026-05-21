import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';

type MutableDocument = {
  cookie: string;
};

function installDocumentCookie(cookie = '') {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie } satisfies MutableDocument,
  });
}

describe('apiClient CSRF handling', () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    installDocumentCookie();
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'document');
  });

  it('fetches and attaches a CSRF token for unsafe requests', async () => {
    const csrfSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      data: { success: true, data: { token: 'csrf-token-1' } },
    });

    apiClient.defaults.adapter = async (config) => {
      expect(config.headers?.get('X-XSRF-TOKEN')).toBe('csrf-token-1');

      return {
        config,
        data: { success: true, data: { ok: true } },
        headers: {},
        status: 200,
        statusText: 'OK',
      };
    };

    const response = await apiClient.post<{ ok: boolean }>('/test-mutation', { ok: true });

    expect(response.data).toEqual({ ok: true });
    expect(csrfSpy).toHaveBeenCalledWith('/api/auth/csrf', { withCredentials: true });
  });

  it('refetches CSRF once and retries a stale-token request', async () => {
    installDocumentCookie('XSRF-TOKEN=stale-token');
    const csrfSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      data: { success: true, data: { token: 'fresh-token' } },
    });
    let calls = 0;

    apiClient.defaults.adapter = async (config) => {
      calls += 1;

      if (calls === 1) {
        expect(config.headers?.get('X-XSRF-TOKEN')).toBe('stale-token');
        return Promise.reject(new AxiosError('Invalid CSRF token', undefined, config, undefined, {
          config,
          data: { error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' } },
          headers: {},
          status: 403,
          statusText: 'Forbidden',
        }));
      }

      expect(config.headers?.get('X-XSRF-TOKEN')).toBe('fresh-token');

      return {
        config,
        data: { success: true, data: { recovered: true } },
        headers: {},
        status: 200,
        statusText: 'OK',
      };
    };

    const response = await apiClient.patch<{ recovered: boolean }>('/test-mutation', {});

    expect(response.data).toEqual({ recovered: true });
    expect(calls).toBe(2);
    expect(csrfSpy).toHaveBeenCalledTimes(1);
  });
});
