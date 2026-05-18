import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/constants';
import { invalidateRoleSensitiveQueries } from '@/lib/socket';
import { queryClient } from '@/lib/query-client';

vi.mock('@/lib/query-client', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

describe('socket role-sensitive invalidation', () => {
  beforeEach(() => {
    vi.mocked(queryClient.invalidateQueries).mockClear();
  });

  it('invalidates permission-sensitive query groups after role updates', () => {
    invalidateRoleSensitiveQueries();

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.auth.me() });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.permissions.me(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.classes.all(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.societies.all(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.servers.all(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.roles.all(),
    });
  });
});
