// ─── Pagination ─────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// ─── Posts ──────────────────────────────────────────────────────────────────

export const MAX_TITLE_LENGTH = 100;
export const MAX_CONTENT_LENGTH = 5000;
export const MAX_ATTACHMENTS = 3;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ─── Route Paths ────────────────────────────────────────────────────────────

export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  CHANGE_PASSWORD: '/change-password',
  HOME: '/',
  SERVERS: '/servers',
  SERVER: (serverId: number | string) => `/servers/${serverId}`,
  CHANNEL: (serverId: number | string, channelId: number | string) =>
    `/servers/${serverId}/channels/${channelId}`,
  MEMBERS: (serverId: number | string) => `/servers/${serverId}/members`,
  PROFILE: '/profile',
  SETTINGS_PASSWORD: '/settings/password',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN: '/admin',
} as const;

// ─── Query Key Factory ──────────────────────────────────────────────────────

export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  users: {
    detail: (userId: number) => ['users', userId] as const,
    list: (params?: Record<string, unknown>) => ['users', params] as const,
  },
  servers: {
    list: (params?: Record<string, unknown>) => ['servers', params] as const,
    detail: (serverId: number) => ['servers', serverId] as const,
    channels: (serverId: number) => ['servers', serverId, 'channels'] as const,
    members: (serverId: number, params?: Record<string, unknown>) =>
      ['servers', serverId, 'members', params] as const,
  },
  channels: {
    detail: (channelId: number) => ['channels', channelId] as const,
  },
  posts: {
    byChannel: (channelId: number, params?: Record<string, unknown>) =>
      ['posts', channelId, params] as const,
    detail: (postId: number) => ['posts', 'detail', postId] as const,
  },
  notifications: {
    list: (params?: Record<string, unknown>) => ['notifications', params] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
    preferences: () => ['notifications', 'preferences'] as const,
  },
  roles: {
    byUser: (userId: number) => ['roles', userId] as const,
  },
  societies: {
    list: (params?: Record<string, unknown>) => ['societies', params] as const,
    detail: (societyId: number) => ['societies', societyId] as const,
    requests: (societyId: number, params?: Record<string, unknown>) =>
      ['societies', societyId, 'requests', params] as const,
    members: (societyId: number, params?: Record<string, unknown>) =>
      ['societies', societyId, 'members', params] as const,
  },
  admin: {
    stats: () => ['admin', 'stats'] as const,
    users: (params?: Record<string, unknown>) => ['admin', 'users', params] as const,
  },
} as const;
