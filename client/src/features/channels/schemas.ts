import { z } from 'zod';

export const createChannelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name must be at most 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .or(z.literal('')),
});

export const updateChannelSchema = createChannelSchema.refine(
  (data) => data.name.trim().length > 0 || (data.description?.trim().length ?? 0) > 0,
  {
    message: 'At least one field is required',
    path: ['name'],
  },
);

export type CreateChannelFormValues = z.infer<typeof createChannelSchema>;
export type UpdateChannelFormValues = z.infer<typeof updateChannelSchema>;
