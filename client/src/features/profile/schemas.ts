import { z } from 'zod';
import { MAX_FILE_SIZE } from '@/lib/constants';

export const updateProfileSchema = z.object({
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

export const profilePictureRules = {
  maxSize: MAX_FILE_SIZE,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export function validateProfilePictureFile(file: File) {
  if (!(profilePictureRules.allowedTypes as readonly string[]).includes(file.type)) {
    return 'Only JPEG, PNG, and WEBP images are allowed.';
  }

  if (file.size > profilePictureRules.maxSize) {
    return 'Profile picture must be 5 MB or smaller.';
  }

  return null;
}
