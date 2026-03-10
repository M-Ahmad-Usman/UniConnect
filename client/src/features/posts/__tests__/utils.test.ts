import { describe, expect, it } from 'vitest';
import { normalizePostListParams, normalizeSearchValue, parseSearchParam, toQueryParamsRecord } from '../utils';

describe('normalizeSearchValue', () => {
  it('trims whitespace around the search input', () => {
    expect(normalizeSearchValue('  urgent notices  ')).toBe('urgent notices');
  });
});

describe('parseSearchParam', () => {
  it('returns an empty string when the search param is missing', () => {
    expect(parseSearchParam(null)).toBe('');
  });

  it('normalizes a present search param', () => {
    expect(parseSearchParam('  exam week  ')).toBe('exam week');
  });
});

describe('normalizePostListParams', () => {
  it('trims search and removes it when empty', () => {
    expect(normalizePostListParams({ page: 1, search: '  exam week  ' })).toEqual({
      page: 1,
      search: 'exam week',
    });

    expect(normalizePostListParams({ page: 1, search: '   ' })).toEqual({ page: 1 });
  });
});

describe('toQueryParamsRecord', () => {
  it('drops undefined values while preserving defined params', () => {
    expect(
      toQueryParamsRecord({ page: 1, limit: 20, search: undefined, priority: 'URGENT' }),
    ).toEqual({
      page: 1,
      limit: 20,
      priority: 'URGENT',
    });
  });

  it('returns undefined when params are missing', () => {
    expect(toQueryParamsRecord(undefined)).toBeUndefined();
  });
});