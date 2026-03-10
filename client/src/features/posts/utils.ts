import type { PostListParams } from '@/types';

export function normalizeSearchValue(value: string) {
  return value.trim();
}

export function parseSearchParam(value: string | null) {
  if (!value) {
    return '';
  }

  return normalizeSearchValue(value);
}

export function normalizePostListParams(params?: PostListParams): PostListParams | undefined {
  if (!params) {
    return undefined;
  }

  const normalizedSearch = typeof params.search === 'string' ? normalizeSearchValue(params.search) : undefined;

  const normalizedParams: PostListParams = {
    ...params,
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
  };

  if (!normalizedSearch) {
    delete normalizedParams.search;
  }

  return normalizedParams;
}

export function toQueryParamsRecord(params?: PostListParams) {
  if (!params) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Record<string, unknown>;
}