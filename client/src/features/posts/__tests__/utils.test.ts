import { describe, expect, it } from 'vitest';
import type { InfiniteData } from '@tanstack/react-query';
import {
  ChannelType,
  PostPriority,
  ServerType,
  UserType,
  type PaginatedResponse,
  type PostListItem,
} from '@/types';
import {
  canDeletePostClient,
  canEditPostClient,
  canPostInChannelClient,
  getEditWindowState,
  getPlainTextPreview,
  normalizeDateParam,
  normalizePostListParams,
  normalizeSearchValue,
  parseSearchParam,
  removePostFromInfiniteData,
  replacePostInInfiniteData,
  sanitizePostHtml,
  toQueryParamsRecord,
  upsertPostInInfiniteData,
  validatePostAttachments,
} from '../utils';

describe('normalizeSearchValue', () => {
  it('trims whitespace around the search input', () => {
    expect(normalizeSearchValue('  urgent notices  ')).toBe('urgent notices');
  });
});

describe('parseSearchParam', () => {
  it('returns an empty string when the search param is missing', () => {
    expect(parseSearchParam(null)).toBe('');
  });

  it('normalizes a present search param', () => {
    expect(parseSearchParam('  exam week  ')).toBe('exam week');
  });
});

describe('normalizePostListParams', () => {
  it('trims search and removes it when empty', () => {
    expect(normalizePostListParams({ page: 1, search: '  exam week  ' })).toEqual({
      page: 1,
      search: 'exam week',
    });

    expect(normalizePostListParams({ page: 1, search: '   ' })).toEqual({ page: 1 });
  });

  it('normalizes date filters and drops invalid values', () => {
    expect(
      normalizePostListParams({
        startDate: '2026-04-01',
        endDate: 'not-a-date',
      }),
    ).toEqual({ startDate: '2026-04-01' });
  });
});

describe('normalizeDateParam', () => {
  it('keeps YYYY-MM-DD dates only', () => {
    expect(normalizeDateParam('2026-04-24')).toBe('2026-04-24');
    expect(normalizeDateParam('04/24/2026')).toBeUndefined();
  });
});

describe('toQueryParamsRecord', () => {
  it('drops undefined values while preserving defined params', () => {
    expect(
      toQueryParamsRecord({ page: 1, limit: 20, search: undefined, priority: 'URGENT' }),
    ).toEqual({
      page: 1,
      limit: 20,
      priority: 'URGENT',
    });
  });

  it('returns undefined when params are missing', () => {
    expect(toQueryParamsRecord(undefined)).toBeUndefined();
  });
});

describe('getPlainTextPreview', () => {
  it('strips markup and truncates long previews', () => {
    expect(getPlainTextPreview('<p>Hello <strong>class</strong></p>', 20)).toBe('Hello class');
    expect(getPlainTextPreview(`<p>${'a'.repeat(30)}</p>`, 10)).toBe('aaaaaaaaaa...');
  });
});

describe('sanitizePostHtml', () => {
  it('removes unsafe link protocols and event handlers', () => {
    const html = sanitizePostHtml(
      '<p><a href="javascript:alert(1)" onclick="alert(1)">Bad</a><a href="https://ntu.edu.pk">Good</a></p>',
    );

    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('onclick');
    expect(html).toContain('href="https://ntu.edu.pk"');
  });

  it('normalizes blank-target links to noopener noreferrer', () => {
    const html = sanitizePostHtml(
      '<a href="mailto:test@example.com" target="_blank" rel="opener">Email</a>',
    );

    expect(html).toContain('href="mailto:test@example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

describe('validatePostAttachments', () => {
  it('accepts up to three valid images', () => {
    const file = new File(['image'], 'notice.png', { type: 'image/png' });
    expect(validatePostAttachments([file])).toEqual([]);
  });

  it('rejects invalid attachment types', () => {
    const file = new File(['pdf'], 'notice.pdf', { type: 'application/pdf' });
    expect(validatePostAttachments([file])).toEqual([
      'notice.pdf must be a JPEG, PNG, or WEBP image.',
    ]);
  });
});

describe('edit and permission helpers', () => {
  const author = {
    publicId: 'user-1',
    fullName: 'Author One',
    email: 'author@example.com',
    userType: UserType.STUDENT,
    profilePictureUrl: null,
    badges: [],
  };
  const post = {
    publicId: 'post-11',
    title: 'Notice',
    content: '<p>Notice</p>',
    priority: PostPriority.NORMAL,
    isPinned: false,
    pinnedAt: null,
    createdAt: '2026-04-24T10:00:00.000Z',
    updatedAt: null,
    author,
    attachments: [],
    _count: { attachments: 0 },
  } satisfies PostListItem;

  it('calculates the 24-hour edit window', () => {
    expect(
      getEditWindowState(post.createdAt, new Date('2026-04-25T09:59:00.000Z')).canEditNow,
    ).toBe(true);
    expect(
      getEditWindowState(post.createdAt, new Date('2026-04-25T10:01:00.000Z')).canEditNow,
    ).toBe(false);
  });

  it('allows authors to edit only inside the edit window', () => {
    const user = {
      publicId: '0198f1f0-0000-7000-8000-000000000010',
      fullName: 'Author One',
      email: 'author@example.com',
      userType: UserType.STUDENT,
      mustChangePassword: false,
      roles: [],
    };

    expect(canEditPostClient(post, user, new Date('2026-04-24T11:00:00.000Z'))).toBe(true);
    expect(canEditPostClient(post, user, new Date('2026-04-26T11:00:00.000Z'))).toBe(false);
  });

  it('allows admins or authors to delete', () => {
    expect(
      canDeletePostClient(post, {
        publicId: '0198f1f0-0000-7000-8000-000000000011',
        fullName: 'Admin',
        email: 'admin@example.com',
        userType: UserType.ADMIN,
        mustChangePassword: false,
        roles: [],
      }),
    ).toBe(true);
  });

  it('mirrors core channel posting permissions from available frontend data', () => {
    const server = {
      publicId: 'server-5',
      name: 'Server',
      description: null,
      type: ServerType.CLASS,
      iconUrl: null,
      isActive: true,
      createdAt: '2026-04-24T10:00:00.000Z',
      department: null,
      class: null,
      society: null,
      _count: { memberships: 1, channels: 1 },
    };
    const channel = {
      publicId: 'channel-9',
      name: 'announcements',
      description: null,
      type: ChannelType.ANNOUNCEMENT,
      isLocked: false,
      isArchived: false,
      isAutoCreated: true,
      courseId: null,
      programId: null,
      createdAt: '2026-04-24T10:00:00.000Z',
    };

    expect(
      canPostInChannelClient({
        server,
        channel,
        user: {
          publicId: '0198f1f0-0000-7000-8000-000000000012',
          fullName: 'CR',
          email: 'cr@example.com',
          userType: UserType.STUDENT,
          mustChangePassword: false,
          roles: [{ role: 'cr', serverPublicId: 'server-5', scopeType: 'server' }],
        },
      }),
    ).toBe(true);

    expect(
      canPostInChannelClient({
        server,
        channel: { ...channel, isLocked: true },
        user: {
          publicId: '0198f1f0-0000-7000-8000-000000000013',
          fullName: 'CR',
          email: 'cr@example.com',
          userType: UserType.STUDENT,
          mustChangePassword: false,
          roles: [{ role: 'cr', serverPublicId: 'server-5', scopeType: 'server' }],
        },
      }),
    ).toBe(false);

    expect(
      canPostInChannelClient({
        server,
        channel: { ...channel, isArchived: true },
        user: {
          publicId: '0198f1f0-0000-7000-8000-000000000014',
          fullName: 'CR',
          email: 'cr@example.com',
          userType: UserType.STUDENT,
          mustChangePassword: false,
          roles: [{ role: 'cr', serverPublicId: 'server-5', scopeType: 'server' }],
        },
      }),
    ).toBe(false);
  });
});

describe('post cache helpers', () => {
  const post = (id: number, title = `Post ${id}`): PostListItem => ({
    publicId: `post-${id}`,
    title,
    content: '<p>Body</p>',
    priority: PostPriority.NORMAL,
    isPinned: false,
    pinnedAt: null,
    createdAt: `2026-04-24T10:0${id}:00.000Z`,
    updatedAt: null,
    author: {
      publicId: 'user-1',
      fullName: 'Author One',
      email: 'author@example.com',
      userType: UserType.STUDENT,
      profilePictureUrl: null,
      badges: [],
    },
    attachments: [],
    _count: { attachments: 0 },
  });

  const infiniteData: InfiniteData<PaginatedResponse<PostListItem>> = {
    pageParams: [1],
    pages: [
      {
        data: [post(1), post(2)],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      },
    ],
  };

  it('upserts, replaces, and removes posts in infinite query pages', () => {
    const upserted = upsertPostInInfiniteData(infiniteData, post(3))!;
    expect(upserted.pages[0]!.data.map((item) => item.publicId)).toContain('post-3');
    expect(upserted.pages[0]!.pagination.total).toBe(3);
    expect(
      replacePostInInfiniteData(infiniteData, post(1, 'Updated'))!.pages[0]!.data[1]!.title,
    ).toBe('Updated');
    expect(
      removePostFromInfiniteData(infiniteData, 'post-1')!.pages[0]!.data.map(
        (item) => item.publicId,
      ),
    ).toEqual(['post-2']);
  });
});
