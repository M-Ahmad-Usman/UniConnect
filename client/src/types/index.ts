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
  CreatableUserType,
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
  DepartmentDeletionImpact,
  DegreeLevel,
  Discipline,
  ProgramListItem,
  ProgramDetail,
  ProgramDeletionImpact,
  ProgramListParams,
  ClassListItem,
  ClassDetail,
  ClassDeletionImpact,
  ClassListParams,
  CourseListItem,
  CourseDetail,
  CourseDeletionImpact,
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
  StaffRoleName,
  RevokableRoleName,
  ScopedRoleAssignment,
  UserRole,
  AcademicAssignRoleRequest,
  CreatePlatformAssignmentRequest,
  CreateStaffAssignmentRequest,
  TransferAdminRequest,
  AssignRoleRequest,
  RevokeRoleRequest,
  UpdatePlatformAssignmentExpiryRequest,
  PlatformAssignment,
  StaffAssignment,
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
  PlatformAssignmentHistoryParams,
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

// Enrollment
export type {
  EnrollmentBootstrap,
  EnrollmentProgramParams,
  EnrollmentClassParams,
  EnrollmentCandidateParams,
  EnrollmentCreateClassRequest,
  EnrollmentCreateStudentRequest,
  EnrollmentClassListItem,
  EnrollmentClassDetail,
  EnrollmentClassStudent,
  EnrollmentProgram,
  EnrollmentCurriculumEntry,
  EnrollmentCreateStudentResponse,
  EnrollmentImportResult,
} from './enrollment.types';

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
  SocietyLeadershipConflictAction,
  SocietyLeadershipConflict,
  SocietyLeadershipConflictResult,
  CreateSocietyRequest,
  UpdateSocietyRequest,
  SocietyLifecycleReasonRequest,
  UpdateSocietyStatusRequest,
  SocietyDeletionImpact,
} from './society.types';

// Admin
export type { AdminStats } from './admin.types';
