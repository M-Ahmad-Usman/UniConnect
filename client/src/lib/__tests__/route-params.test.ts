import { describe, expect, it } from 'vitest';
import { parseRouteParamId } from '../route-params';

describe('parseRouteParamId', () => {
  it('returns a positive integer for valid numeric route params', () => {
    expect(parseRouteParamId('42')).toBe(42);
  });

  it('returns null for missing route params', () => {
    expect(parseRouteParamId(undefined)).toBeNull();
  });

  it('returns null for non-integer or non-positive route params', () => {
    expect(parseRouteParamId('0')).toBeNull();
    expect(parseRouteParamId('-3')).toBeNull();
    expect(parseRouteParamId('1.5')).toBeNull();
    expect(parseRouteParamId('abc')).toBeNull();
  });
});