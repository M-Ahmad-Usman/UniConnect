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
  NOTIFICATIONS: '/notifications',
  SERVER: (serverPublicId: string) => `/servers/${serverPublicId}`,
  CHANNEL: (serverPublicId: string, channelPublicId: string) =>
    `/servers/${serverPublicId}/channels/${channelPublicId}`,
  MEMBERS: (serverPublicId: string) => `/servers/${serverPublicId}/members`,
  SERVER_NOTIFICATION_SETTINGS: (serverPublicId: string) =>
    `/servers/${serverPublicId}/settings/notifications`,
  SOCIETIES: '/societies',
  SOCIETY: (societyId: number | string) => `/societies/${societyId}`,
  ROLES: '/roles',
  ACADEMICS_CLASSES: '/academics/classes',
  ACADEMICS_CLASS: (classPublicId: string) => `/academics/classes/${classPublicId}`,
  ACADEMICS_COURSES: '/academics/courses',
  ACADEMICS_PROGRAM_CURRICULUM: (programId: number | string) =>
    `/academics/programs/${programId}/curriculum`,
  PROFILE: '/profile',
  SETTINGS_PASSWORD: '/settings/password',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_USERS_NEW: '/admin/users/new',
  ADMIN_USERS_IMPORT: '/admin/users/import',
  ADMIN_DEPARTMENTS: '/admin/departments',
  ADMIN_DEPARTMENT: (departmentId: number | string) => `/admin/departments/${departmentId}`,
  ADMIN_PROGRAMS: '/admin/programs',
  ADMIN_PROGRAM_CURRICULUM: (programId: number | string) =>
    `/admin/programs/${programId}/curriculum`,
  ADMIN_DISCIPLINES: '/admin/disciplines',
  ADMIN_CLASSES: '/admin/classes',
  ADMIN_CLASS: (classPublicId: string) => `/admin/classes/${classPublicId}`,
  ADMIN_SOCIETIES: '/admin/societies',
  ADMIN_ROLES: '/admin/roles',
  ADMIN: '/admin',
} as const;

// ─── Query Key Factory ──────────────────────────────────────────────────────

export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  users: {
    me: () => ['users', 'me'] as const,
    detail: (userPublicId: string) => ['users', userPublicId] as const,
    list: (params?: Record<string, unknown>) => ['users', params] as const,
    deletionImpact: (userPublicId: string) => ['users', userPublicId, 'deletion-impact'] as const,
  },
  permissions: {
    me: () => ['permissions', 'me'] as const,
  },
  departments: {
    list: () => ['departments'] as const,
    detail: (departmentId: number) => ['departments', departmentId] as const,
    deletionImpact: (departmentId: number) => ['departments', departmentId, 'deletion-impact'] as const,
    stats: (departmentId: number) => ['departments', departmentId, 'stats'] as const,
    programs: (departmentId: number) => ['departments', departmentId, 'programs'] as const,
  },
  degreeLevels: {
    list: () => ['degree-levels'] as const,
  },
  disciplines: {
    list: () => ['disciplines'] as const,
  },
  programs: {
    all: () => ['programs'] as const,
    list: (params?: Record<string, unknown>) => ['programs', params] as const,
    detail: (programId: number) => ['programs', programId] as const,
    deletionImpact: (programId: number) => ['programs', programId, 'deletion-impact'] as const,
    curriculumRoot: (programId: number) => ['programs', programId, 'curriculum'] as const,
    curriculum: (programId: number, params?: Record<string, unknown>) =>
      ['programs', programId, 'curriculum', params] as const,
  },
  classes: {
    all: () => ['classes'] as const,
    list: (params?: Record<string, unknown>) => ['classes', params] as const,
    detail: (classPublicId: string) => ['classes', classPublicId] as const,
    deletionImpact: (classPublicId: string) => ['classes', classPublicId, 'deletion-impact'] as const,
    courses: (classPublicId: string) => ['classes', classPublicId, 'courses'] as const,
    students: (classPublicId: string, params?: Record<string, unknown>) =>
      params
        ? (['classes', classPublicId, 'students', params] as const)
        : (['classes', classPublicId, 'students'] as const),
    studentCandidates: (classPublicId: string, params?: Record<string, unknown>) =>
      params
        ? (['classes', classPublicId, 'student-candidates', params] as const)
        : (['classes', classPublicId, 'student-candidates'] as const),
    teacherCandidates: (classPublicId: string, params?: Record<string, unknown>) =>
      params
        ? (['classes', classPublicId, 'teacher-candidates', params] as const)
        : (['classes', classPublicId, 'teacher-candidates'] as const),
  },
  courses: {
    all: () => ['courses'] as const,
    list: (params?: Record<string, unknown>) => ['courses', params] as const,
    detail: (courseId: number) => ['courses', courseId] as const,
    deletionImpact: (courseId: number) => ['courses', courseId, 'deletion-impact'] as const,
  },
  servers: {
    all: () => ['servers'] as const,
    list: (params?: Record<string, unknown>) => ['servers', params] as const,
    detail: (serverPublicId: string) => ['servers', serverPublicId] as const,
    channels: (serverPublicId: string, params?: Record<string, unknown>) =>
      ['servers', serverPublicId, 'channels', params] as const,
    members: (serverPublicId: string, params?: Record<string, unknown>) =>
      ['servers', serverPublicId, 'members', params] as const,
  },
  channels: {
    detail: (channelPublicId: string) => ['channels', channelPublicId] as const,
  },
  posts: {
    byChannel: (channelPublicId: string, params?: Record<string, unknown>) =>
      ['posts', channelPublicId, params] as const,
    detail: (postPublicId: string) => ['posts', 'detail', postPublicId] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    list: (params?: Record<string, unknown>) => ['notifications', params] as const,
    preview: () => ['notifications', 'preview'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
    preferencesRoot: () => ['notifications', 'preferences'] as const,
    preferences: (params?: Record<string, unknown>) =>
      ['notifications', 'preferences', params] as const,
  },
  roles: {
    all: () => ['roles'] as const,
    byUser: (userPublicId: string) => ['roles', userPublicId] as const,
    currentUser: () => ['roles', 'current-user'] as const,
    assignable: () => ['roles', 'assignable'] as const,
    assignableScopes: (params?: object) => ['roles', 'assignable-scopes', params] as const,
    assignableChannels: (params?: object) => ['roles', 'assignable-channels', params] as const,
    assignableUsers: (params?: object) => ['roles', 'assignable-users', params] as const,
    revokable: (params?: object) => ['roles', 'revokable', params] as const,
    history: (params?: object) => ['roles', 'history', params] as const,
  },
  societies: {
    all: () => ['societies'] as const,
    list: (params?: Record<string, unknown>) => ['societies', params] as const,
    detail: (societyPublicId: string) => ['societies', societyPublicId] as const,
    deletionImpact: (societyPublicId: string) => ['societies', societyPublicId, 'deletion-impact'] as const,
    myMembership: (societyPublicId: string) => ['societies', societyPublicId, 'my-membership'] as const,
    requests: (societyPublicId: string, params?: Record<string, unknown>) =>
      params
        ? (['societies', societyPublicId, 'requests', params] as const)
        : (['societies', societyPublicId, 'requests'] as const),
    members: (societyPublicId: string, params?: Record<string, unknown>) =>
      params
        ? (['societies', societyPublicId, 'members', params] as const)
        : (['societies', societyPublicId, 'members'] as const),
    candidates: (societyPublicId: string, params?: Record<string, unknown>) =>
      params
        ? (['societies', societyPublicId, 'candidates', params] as const)
        : (['societies', societyPublicId, 'candidates'] as const),
    leadershipCandidates: (params?: Record<string, unknown>) =>
      params
        ? (['societies', 'leadership-candidates', params] as const)
        : (['societies', 'leadership-candidates'] as const),
  },
  admin: {
    stats: () => ['admin', 'stats'] as const,
    usersRoot: () => ['admin', 'users'] as const,
    users: (params?: Record<string, unknown>) => ['admin', 'users', params] as const,
  },
} as const;
