import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { queryClient } from '@/lib/query-client';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe('queryClient error handling', () => {
  it('does not show global toasts for query errors by default', async () => {
    await expect(
      queryClient.fetchQuery({
        queryKey: ['query-error-default'],
        queryFn: () => Promise.reject(new Error('Network unavailable')),
        retry: false,
      }),
    ).rejects.toThrow('Network unavailable');

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows a global query toast only when explicitly opted in', async () => {
    await expect(
      queryClient.fetchQuery({
        queryKey: ['query-error-toast'],
        queryFn: () => Promise.reject(new Error('Network unavailable')),
        retry: false,
        meta: { toastOnError: true },
      }),
    ).rejects.toThrow('Network unavailable');

    expect(toast.error).toHaveBeenCalledWith('Network unavailable');
  });
});
