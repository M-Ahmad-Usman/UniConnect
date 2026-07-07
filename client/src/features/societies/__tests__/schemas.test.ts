import { describe, expect, it } from 'vitest';
import { societySchema, updateSocietySchema } from '../schemas';

const publicId = '018f47a2-5d6b-7c8d-9e0f-123456789abc';

describe('society schemas', () => {
  it('requires an owning department and public IDs for society leadership', () => {
    const parsed = societySchema.safeParse({
      name: 'Robotics Club',
      description: 'University-wide robotics society',
      departmentId: 3,
      presidentPublicId: publicId,
      convenorPublicId: '018f47a2-5d6b-7c8d-9e0f-123456789abd',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects empty updates so the API is not called with no changes', () => {
    const parsed = updateSocietySchema.safeParse({});

    expect(parsed.success).toBe(false);
  });
});
