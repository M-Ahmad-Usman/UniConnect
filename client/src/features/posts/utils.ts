import DOMPurify from 'dompurify';
import type { InfiniteData } from '@tanstack/react-query';
import { MAX_ATTACHMENTS, MAX_FILE_SIZE } from '@/lib/constants';
import { ChannelType, PostPriority, UserType, type AuthUser, type ChannelListItem, type PaginatedResponse, type PostDetail, type PostListItem, type PostListParams, type ScopedRoleAssignment, type ServerDetail } from '@/types';

const ALLOWED_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function normalizeSearchValue(value: string) {
  return value.trim();
}

export function parseSearchParam(value: string | null) {
  if (!value) {
    return '';
  }

  return normalizeSearchValue(value);
}

export function normalizePostListParams(params?: PostListParams): PostListParams | undefined {
  if (!params) {
    return undefined;
  }

  const normalizedSearch = typeof params.search === 'string' ? normalizeSearchValue(params.search) : undefined;
  const normalizedStartDate = normalizeDateParam(params.startDate);
  const normalizedEndDate = normalizeDateParam(params.endDate);

  const normalizedParams: PostListParams = {
    ...params,
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(normalizedStartDate ? { startDate: normalizedStartDate } : {}),
    ...(normalizedEndDate ? { endDate: normalizedEndDate } : {}),
  };

  if (!normalizedSearch) {
    delete normalizedParams.search;
  }
  if (!normalizedStartDate) {
    delete normalizedParams.startDate;
  }
  if (!normalizedEndDate) {
    delete normalizedParams.endDate;
  }

  return normalizedParams;
}

export function toQueryParamsRecord(params?: PostListParams) {
  if (!params) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Record<string, unknown>;
}

export function normalizeDateParam(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

export function sanitizePostHtml(html: string) {
  if (typeof window === 'undefined') {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '');
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

export function getPlainTextPreview(html: string, maxLength = 220) {
  const sanitized = sanitizePostHtml(html);
  const text =
    typeof document === 'undefined'
      ? sanitized.replace(/<[^>]*>/g, ' ')
      : (() => {
          const element = document.createElement('div');
          element.innerHTML = sanitized;
          return element.textContent ?? '';
        })();
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}

export function validatePostAttachments(files: File[]) {
  const errors: string[] = [];

  if (files.length > MAX_ATTACHMENTS) {
    errors.push(`Attach up to ${MAX_ATTACHMENTS} images.`);
  }

  files.forEach((file) => {
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      errors.push(`${file.name} must be a JPEG, PNG, or WEBP image.`);
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name} must be 5MB or smaller.`);
    }
  });

  return errors;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function getEditWindowState(createdAt: string, now = new Date()) {
  const created = new Date(createdAt);
  const expiresAt = new Date(created.getTime() + EDIT_WINDOW_MS);
  const remainingMs = expiresAt.getTime() - now.getTime();

  return {
    canEditNow: remainingMs > 0,
    expiresAt,
    remainingMs: Math.max(0, remainingMs),
    remainingLabel: formatRemainingEditWindow(Math.max(0, remainingMs)),
  };
}

export function formatRemainingEditWindow(remainingMs: number) {
  if (remainingMs <= 0) {
    return 'expired';
  }

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  if (hours <= 0) {
    return `${minutes}m left`;
  }

  return `${hours}h ${minutes}m left`;
}

function hasServerRole(roles: ScopedRoleAssignment[], serverId: number, accepted: string[]) {
  return roles.some((role) => role.serverId === serverId && accepted.includes(role.role));
}

function hasChannelModeratorRole(roles: ScopedRoleAssignment[], serverId: number, channelId: number) {
  return roles.some(
    (role) =>
      role.serverId === serverId &&
      role.role === 'channel_moderator' &&
      role.channelId === channelId,
  );
}

export function canPostInChannelClient({
  user,
  server,
  channel,
}: {
  user: AuthUser | null | undefined;
  server: ServerDetail | null | undefined;
  channel: ChannelListItem | null | undefined;
}) {
  if (!user || !server || !channel || channel.isLocked || channel.isArchived) {
    return false;
  }

  if (user.userType === UserType.ADMIN) {
    return true;
  }

  const roles = user.roles ?? [];
  const elevatedRoles = ['hod', 'cr', 'society_president', 'society_convenor', 'server_moderator'];

  if (hasServerRole(roles, server.id, elevatedRoles) || hasChannelModeratorRole(roles, server.id, channel.id)) {
    return true;
  }

  if (channel.type === ChannelType.GENERAL) {
    return true;
  }

  if (channel.type === ChannelType.PROGRAM && hasServerRole(roles, server.id, ['program_director'])) {
    return true;
  }

  if (channel.type === ChannelType.COURSE && user.userType === UserType.TEACHER) {
    return true;
  }

  return false;
}

export function canEditPostClient(post: Pick<PostListItem | PostDetail, 'author' | 'createdAt'>, user: AuthUser | null | undefined, now = new Date()) {
  return user?.id === post.author.id && getEditWindowState(post.createdAt, now).canEditNow;
}

export function canDeletePostClient(post: Pick<PostListItem | PostDetail, 'author'>, user: AuthUser | null | undefined) {
  return user?.id === post.author.id || user?.userType === UserType.ADMIN;
}

export function detailToListItem(post: PostDetail): PostListItem {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    priority: post.priority,
    isPinned: post.isPinned,
    pinnedAt: post.pinnedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author,
    _count: {
      attachments: post.attachments.length,
    },
  };
}

export function sortPostsForFeed(posts: PostListItem[]) {
  return [...posts].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function upsertPostInPage(page: PaginatedResponse<PostListItem>, post: PostListItem) {
  const hasExisting = page.data.some((current) => current.id === post.id);
  const withoutExisting = page.data.filter((current) => current.id !== post.id);
  return {
    ...page,
    data: sortPostsForFeed([post, ...withoutExisting]),
    pagination: {
      ...page.pagination,
      total: hasExisting ? page.pagination.total : page.pagination.total + 1,
    },
  };
}

export function replacePostInPage(page: PaginatedResponse<PostListItem>, post: PostListItem) {
  return {
    ...page,
    data: sortPostsForFeed(page.data.map((current) => (current.id === post.id ? post : current))),
  };
}

export function removePostFromPage(page: PaginatedResponse<PostListItem>, postId: number) {
  const hasPost = page.data.some((current) => current.id === postId);

  return {
    ...page,
    data: page.data.filter((current) => current.id !== postId),
    pagination: {
      ...page.pagination,
      total: hasPost ? Math.max(0, page.pagination.total - 1) : page.pagination.total,
    },
  };
}

export function upsertPostInInfiniteData(
  current: InfiniteData<PaginatedResponse<PostListItem>> | undefined,
  post: PostListItem,
) {
  if (!current) {
    return current;
  }

  const firstPageIndex = 0;
  return {
    ...current,
    pages: current.pages.map((page, index) =>
      index === firstPageIndex ? upsertPostInPage(page, post) : removePostFromPage(page, post.id),
    ),
  };
}

export function replacePostInInfiniteData(
  current: InfiniteData<PaginatedResponse<PostListItem>> | undefined,
  post: PostListItem,
) {
  if (!current) {
    return current;
  }

  return {
    ...current,
    pages: current.pages.map((page) => replacePostInPage(page, post)),
  };
}

export function removePostFromInfiniteData(
  current: InfiniteData<PaginatedResponse<PostListItem>> | undefined,
  postId: number,
) {
  if (!current) {
    return current;
  }

  return {
    ...current,
    pages: current.pages.map((page) => removePostFromPage(page, postId)),
  };
}

export const priorityLabels: Record<PostPriority, string> = {
  NORMAL: 'Normal',
  IMPORTANT: 'Important',
  URGENT: 'Urgent',
};
