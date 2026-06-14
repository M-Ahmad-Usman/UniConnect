import { z } from 'zod';
import { MAX_ATTACHMENTS, MAX_CONTENT_LENGTH, MAX_FILE_SIZE, MAX_TITLE_LENGTH } from '@/lib/constants';
import { PostPriority } from '@/types';
import { validatePostAttachments } from './utils';

export const postPrioritySchema = z.enum([
  PostPriority.NORMAL,
  PostPriority.IMPORTANT,
  PostPriority.URGENT,
]);

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`),
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(MAX_CONTENT_LENGTH, `Content must be at most ${MAX_CONTENT_LENGTH} characters`),
  priority: postPrioritySchema.default(PostPriority.NORMAL),
  attachments: z.custom<File[]>().default([]).superRefine((files, context) => {
    for (const message of validatePostAttachments(files)) {
      context.addIssue({ code: 'custom', message });
    }
  }),
});

export const updatePostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`)
      .optional(),
    content: z
      .string()
      .trim()
      .min(1, 'Content is required')
      .max(MAX_CONTENT_LENGTH, `Content must be at most ${MAX_CONTENT_LENGTH} characters`)
      .optional(),
    priority: postPrioritySchema.optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined || data.priority !== undefined, {
    message: 'At least one field must be changed',
    path: ['title'],
  });

export type CreatePostFormValues = z.infer<typeof createPostSchema>;
export type UpdatePostFormValues = z.infer<typeof updatePostSchema>;

export const postAttachmentLimits = {
  maxAttachments: MAX_ATTACHMENTS,
  maxFileSize: MAX_FILE_SIZE,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;
