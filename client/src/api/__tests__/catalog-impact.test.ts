import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogApi } from '@/api/endpoints/catalog.api';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);

describe('catalog impact endpoints', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls rare deletion-impact routes with the expected identifiers', async () => {
    mockedGet.mockResolvedValue({ data: { canDelete: true } });

    await expect(catalogApi.getDepartmentDeletionImpact(1)).resolves.toEqual({ canDelete: true });
    await expect(catalogApi.getProgramDeletionImpact(2)).resolves.toEqual({ canDelete: true });
    await expect(catalogApi.getClassDeletionImpact('018f47a2-5d6b-7c8d-9e0f-123456789abc')).resolves.toEqual({
      canDelete: true,
    });
    await expect(catalogApi.getCourseDeletionImpact(3)).resolves.toEqual({ canDelete: true });

    expect(mockedGet).toHaveBeenNthCalledWith(1, '/departments/1/deletion-impact');
    expect(mockedGet).toHaveBeenNthCalledWith(2, '/programs/2/deletion-impact');
    expect(mockedGet).toHaveBeenNthCalledWith(
      3,
      '/classes/018f47a2-5d6b-7c8d-9e0f-123456789abc/deletion-impact',
    );
    expect(mockedGet).toHaveBeenNthCalledWith(4, '/courses/3/deletion-impact');
  });
});
