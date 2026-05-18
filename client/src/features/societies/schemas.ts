import { z } from 'zod';

const requiredNumericIdSchema = z.number().int().positive('Select a valid option');

export const societySchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().trim().max(500, 'Description must be at most 500 characters').optional(),
  departmentId: requiredNumericIdSchema,
  presidentId: requiredNumericIdSchema,
  convenorId: requiredNumericIdSchema,
});

export const updateSocietySchema = societySchema
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Change at least one field',
  });

export type SocietyFormValues = z.output<typeof societySchema>;
export type SocietyFormInput = z.input<typeof societySchema>;
export type UpdateSocietyFormValues = z.output<typeof updateSocietySchema>;
