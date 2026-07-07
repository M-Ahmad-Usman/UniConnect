import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';
import { societiesApi } from '@/api/endpoints/societies.api';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);

describe('societiesApi', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls leadership candidate search with department authorization context', async () => {
    mockedGet.mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } },
    });

    await societiesApi.listLeadershipCandidates({
      departmentId: 12,
      role: 'president',
      page: 1,
      limit: 50,
      search: 'hamza',
    });

    expect(mockedGet).toHaveBeenCalledWith('/societies/leadership-candidates', {
      params: { departmentId: 12, role: 'president', page: 1, limit: 50, search: 'hamza' },
    });
  });

  it('calls leadership conflict preflight for lifecycle actions', async () => {
    mockedGet.mockResolvedValue({ data: { hasConflicts: false, conflicts: [] } });

    await expect(
      societiesApi.getLeadershipConflicts('018f47a2-5d6b-7c8d-9e0f-123456789abc', 'activate'),
    ).resolves.toEqual({ hasConflicts: false, conflicts: [] });

    expect(mockedGet).toHaveBeenCalledWith(
      '/societies/018f47a2-5d6b-7c8d-9e0f-123456789abc/leadership-conflicts',
      { params: { action: 'activate' } },
    );
  });
});
