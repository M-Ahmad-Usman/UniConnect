import { z } from 'zod';

const requiredNumericIdSchema = z.number().int().positive('Select a valid option');
const requiredPublicIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'Select a valid option');

export const societySchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().trim().max(500, 'Description must be at most 500 characters').optional(),
  departmentId: requiredNumericIdSchema,
  presidentPublicId: requiredPublicIdSchema,
  convenorPublicId: requiredPublicIdSchema,
});

export const updateSocietySchema = societySchema
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Change at least one field',
  });

export type SocietyFormValues = z.output<typeof societySchema>;
export type SocietyFormInput = z.input<typeof societySchema>;
export type UpdateSocietyFormValues = z.output<typeof updateSocietySchema>;
