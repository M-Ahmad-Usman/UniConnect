// Enums
export * from './enums';

// API wrappers
export { ApiError } from './api.types';
export type {
  ApiResponse,
  PaginatedResponse,
  ApiErrorResponse,
  PaginationMeta,
  PaginationParams,
} from './api.types';

// Auth
export type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  EmptyAuthResponse,
} from './auth.types';

// Users
export type {
  UserProfile,
  StudentInfo,
  TeacherInfo,
  UserListItem,
  UserDetail,
  UserSummary,
  UpdateProfileRequest,
  UpdateProfileResponse,
  CreateUserRequest,
  CreateUserResponse,
  UserListParams,
  BulkImportError,
  BulkImportResult,
} from './user.types';

// Catalog
export type { DepartmentListItem, ProgramListItem, ClassListItem } from './catalog.types';

// Servers
export type { MemberBadge, ServerListItem, ServerDetail, ServerMember } from './server.types';

// Channels
export type {
  Channel,
  ChannelListItem,
  CreateChannelRequest,
  CreateChannelResponse,
  LockChannelResponse,
  UnlockChannelResponse,
  UpdateChannelRequest,
  UpdateChannelResponse,
} from './channel.types';

// Posts
export type {
  PostAuthor,
  PostAttachment,
  PostListItem,
  PostDetail,
  CreatePostRequest,
  UpdatePostRequest,
  PostListParams,
  PostRealtimePayload,
  PostDeletedPayload,
} from './post.types';

// Notifications
export type {
  Notification,
  NotificationListParams,
  NotificationPreference,
  NotificationPreferenceListParams,
  UpdatePreferenceRequest,
  UnreadCountResponse,
  NewNotificationPayload,
  UnreadCountPayload,
} from './notification.types';

// Roles
export type {
  RoleName,
  ModerationRoleName,
  RevokableRoleName,
  ScopedRoleAssignment,
  UserRole,
  AssignRoleRequest,
  RevokeRoleRequest,
} from './role.types';

// Societies
export type {
  SocietyListItem,
  SocietyDetail,
  SocietyMembershipRequest,
  CreateSocietyRequest,
  UpdateSocietyRequest,
} from './society.types';

// Admin
export type { AdminStats } from './admin.types';
