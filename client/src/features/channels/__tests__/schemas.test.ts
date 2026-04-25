import { describe, expect, it } from 'vitest';
import { createChannelSchema, updateChannelSchema } from '@/features/channels/schemas';

describe('createChannelSchema', () => {
  it('accepts valid payload with optional description', () => {
    const result = createChannelSchema.safeParse({
      name: 'class-announcements',
      description: 'Official updates for this class cohort.',
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty description and trims name', () => {
    const result = createChannelSchema.safeParse({
      name: '  semester-updates  ',
      description: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('semester-updates');
  });

  it('rejects missing name', () => {
    const result = createChannelSchema.safeParse({
      name: '',
      description: 'desc',
    });

    expect(result.success).toBe(false);
  });

  it('rejects values beyond max lengths', () => {
    const result = createChannelSchema.safeParse({
      name: 'a'.repeat(101),
      description: 'b'.repeat(501),
    });

    expect(result.success).toBe(false);
  });
});

describe('updateChannelSchema', () => {
  it('accepts unchanged-looking input as long as at least one field is present', () => {
    const result = updateChannelSchema.safeParse({
      name: 'announcements',
      description: '',
    });

    expect(result.success).toBe(true);
  });

  it('rejects payloads that omit both editable fields', () => {
    const result = updateChannelSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
