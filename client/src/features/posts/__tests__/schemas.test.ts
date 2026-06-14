import { describe, expect, it } from 'vitest';
import { PostPriority } from '@/types';
import { createPostSchema, updatePostSchema } from '../schemas';

describe('createPostSchema', () => {
  it('accepts a valid rich post payload', () => {
    const result = createPostSchema.safeParse({
      title: 'Exam schedule',
      content: '<p>The exam starts at 9 AM.</p>',
      priority: PostPriority.IMPORTANT,
      attachments: [new File(['image'], 'notice.png', { type: 'image/png' })],
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty title and content', () => {
    const result = createPostSchema.safeParse({
      title: '',
      content: '',
      priority: PostPriority.NORMAL,
      attachments: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid file attachments', () => {
    const result = createPostSchema.safeParse({
      title: 'Notice',
      content: '<p>Read this.</p>',
      priority: PostPriority.NORMAL,
      attachments: [new File(['pdf'], 'notice.pdf', { type: 'application/pdf' })],
    });

    expect(result.success).toBe(false);
  });
});

describe('updatePostSchema', () => {
  it('requires at least one changed field', () => {
    expect(updatePostSchema.safeParse({}).success).toBe(false);
    expect(updatePostSchema.safeParse({ title: 'Updated title' }).success).toBe(true);
  });
});
