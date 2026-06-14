import { describe, expect, it } from 'vitest';
import { updateProfileSchema, validateProfilePictureFile } from '../schemas';

describe('updateProfileSchema', () => {
  it('accepts bios up to 500 characters', () => {
    expect(updateProfileSchema.safeParse({ bio: 'a'.repeat(500) }).success).toBe(true);
  });

  it('rejects long bios', () => {
    expect(updateProfileSchema.safeParse({ bio: 'a'.repeat(501) }).success).toBe(false);
  });
});

describe('validateProfilePictureFile', () => {
  it('accepts supported images', () => {
    const file = new File(['image'], 'profile.webp', { type: 'image/webp' });
    expect(validateProfilePictureFile(file)).toBeNull();
  });

  it('rejects unsupported files', () => {
    const file = new File(['pdf'], 'profile.pdf', { type: 'application/pdf' });
    expect(validateProfilePictureFile(file)).toBe('Only JPEG, PNG, and WEBP images are allowed.');
  });
});
