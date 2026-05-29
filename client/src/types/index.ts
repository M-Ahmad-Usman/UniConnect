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
  UserDeletionImpact,
  UserLifecycleReasonRequest,
  UpdateUserStatusRequest,
  BulkImportError,
  BulkImportResult,
} from './user.types';

// Catalog
export type {
  DepartmentListItem,
  DepartmentDetail,
  DepartmentStats,
  DegreeLevel,
  Discipline,
  ProgramListItem,
  ProgramDetail,
  ProgramListParams,
  ClassListItem,
  ClassDetail,
  ClassListParams,
  CourseListItem,
  CourseDetail,
  CourseListParams,
  CurriculumEntry,
  ClassCourseAssignment,
  ClassStudent,
  TeacherCandidate,
  TeacherAssignmentInput,
} from './catalog.types';

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
  NotificationPreferenceType,
  UpdatePreferenceRequest,
  UnreadCountResponse,
  NewNotificationPayload,
  DeletedNotificationPayload,
  UnreadCountPayload,
} from './notification.types';

// Roles
export type {
  RoleName,
  AssignableRoleName,
  ModerationRoleName,
  RevokableRoleName,
  ScopedRoleAssignment,
  UserRole,
  AssignRoleRequest,
  RevokeRoleRequest,
  RoleOption,
  RoleScopeOption,
  RoleChannelOption,
  RoleUserOption,
  RevokableRoleAssignment,
  RoleOptionParams,
  AssignableScopesParams,
  AssignableChannelsParams,
  AssignableUsersParams,
  RevokableRolesParams,
} from './role.types';

// Permissions
export type {
  GlobalPermissions,
  ClassPermissions,
  SocietyPermissions,
  RoleWorkspacePermissions,
  PermissionScopeSummary,
  MyPermissions,
} from './permission.types';

// Societies
export type {
  SocietyListItem,
  SocietyDetail,
  SocietyMembershipRequest,
  SocietyMember,
  SocietyMembershipStatus,
  SocietyListParams,
  SocietyRequestListParams,
  SocietyCandidateParams,
  SocietyLeadershipCandidateParams,
  CreateSocietyRequest,
  UpdateSocietyRequest,
} from './society.types';

// Admin
export type { AdminStats } from './admin.types';
