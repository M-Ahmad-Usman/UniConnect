
import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely'

// Import types from constants (single source of truth for TypeScript types)
import type {
  DegreeLevel,
  Gender,
  ClassSection,
  PostPriority,
  MembershipRequestStatus,
  NotificationScope,
  DisciplineValue,
  UserTypeValue,
  DesignationValue,
  ServerTypeValue,
  ChannelTypeValue,
  PostAttachmentTypeValue,
  NotificationTypeValue,
} from './constants.js'

/* Developer Notes

 Table and Column Naming:
  - Tables and Field names use camelCase naming convention in this file.
  - This project uses Kysley's camel case plugin to convert camel casing into snake casing.

 Manual snake case conversion:
  - Migrations have to make sure to use snake_case naming (Postgres convention). Camel Case plugin willn't work there.
  - Camel Case plugin willn't convert casing for raw sql queries. Will have to use actual snake case

 Type Source of Truth:
  - All constrained value types are defined in constants.ts
  - Migrations contain their own hardcoded data (immutable snapshots)
  - constants.ts defines current values for app layer + TypeScript types

  IMPORTANT: Make sure to keep the contants.ts and db in sync
*/



/* Main Database Interface Object
 - Keys represent table names (snake cased in DB)
 - Values represent structure of tables
*/
export interface Database {
  departments: DepartmentTable
  disciplines: DisciplineTable
  programs: ProgramTable
  programCurricula: ProgramCurriculumTable
  userTypes: UserTypeTable
  users: UserTable
  userTypeAssignments: UserTypeAssignmentTable
  students: StudentTable
  designations: DesignationTable
  teachers: TeacherTable
  classes: ClassTable
  societies: SocietyTable
  serverTypes: ServerTypeTable
  servers: ServerTable
  channelTypes: ChannelTypeTable
  channels: ChannelTable
  serverMemberships: ServerMembershipTable
  societyMembershipRequests: SocietyMembershipRequestTable
  courses: CourseTable
  courseAssignments: CourseAssignmentTable
  posts: PostTable
  postAttachmentTypes: PostAttachmentTypeTable
  postAttachments: PostAttachmentTable
  userRoles: UserRoleTable
  permissions: PermissionTable
  userRolePermissions: UserRolePermissionTable
  userRoleAssignments: UserRoleAssignmentTable
  notificationTypes: NotificationTypeTable
  notifications: NotificationTable
  notificationPreferences: NotificationPreferenceTable
  refreshTokens: RefreshTokenTable
}

// Snake cased Table names derived from database.
// This object is used by create tables migration.
export const TABLE_NAMES = {
  departments: 'departments',
  disciplines: 'disciplines',
  programs: 'programs',
  programCurricula: 'program_curricula',
  userTypes: 'user_types',
  users: 'users',
  userTypeAssignments: 'user_type_assignments',
  students: 'students',
  designations: 'designations',
  teachers: 'teachers',
  classes: 'classes',
  societies: 'societies',
  serverTypes: 'server_types',
  servers: 'servers',
  channelTypes: 'channel_types',
  channels: 'channels',
  serverMemberships: 'server_memberships',
  societyMembershipRequests: 'society_membership_requests',
  courses: 'courses',
  courseAssignments: 'course_assignments',
  posts: 'posts',
  postAttachmentTypes: 'post_attachment_types',
  postAttachments: 'post_attachments',
  userRoles: 'user_roles',
  permissions: 'permissions',
  userRolePermissions: 'user_role_permissions',
  userRoleAssignments: 'user_role_assignments',
  notificationTypes: 'notification_types',
  notifications: 'notifications',
  notificationPreferences: 'notification_preferences',
  refreshTokens: 'refresh_tokens',
} as const satisfies Record<keyof Database, string>



// Branded ID Types — phantom tags for type-safe entity IDs (zero runtime cost)
// Branding IDs prevents mixing up different entity IDs (e.g., UserId vs ChannelId)
type Brand<T, B> = T & { readonly __brand: B }

export type DepartmentId = Brand<number, 'DepartmentId'>
export type ProgramId = Brand<number, 'ProgramId'>
export type UserId = Brand<number, 'UserId'>
export type StudentId = Brand<number, 'StudentId'>
export type TeacherId = Brand<number, 'TeacherId'>
export type ClassId = Brand<number, 'ClassId'>
export type SocietyId = Brand<number, 'SocietyId'>
export type ServerId = Brand<number, 'ServerId'>
export type ChannelId = Brand<number, 'ChannelId'>
export type CourseId = Brand<number, 'CourseId'>
export type PostId = Brand<number, 'PostId'>
export type PermissionId = Brand<number, 'PermissionId'>
export type UserRoleValue = Brand<string, 'UserRoleValue'>



// Types for Timestamp related Audit fields

// Fields Controlled By db (triggers or default values)
type CreatedAt = ColumnType<Date, never, never>
type LockedAt = ColumnType<Date | null, never, never>
type UpdatedAt = ColumnType<Date | null, never, never>
type ArchivedAt = ColumnType<Date | null, never, never>
type DeletedAt = ColumnType<Date | null, never, never>
type ServerJoinedAt = ColumnType<Date, never, never>
type MembershipRequestedAt = ColumnType<Date, never, never>
type RequestReviewedAt = ColumnType<Date | null, never, never>
type PostPinnedAt = ColumnType<Date | null, never, never>
type EditedAt = ColumnType<Date | null, never, never>
type UploadedAt = ColumnType<Date, never, never>
type RoleAssignedAt = ColumnType<Date, never, never>

// Fields Controlled by App Layer
type NotificationReadAt = ColumnType<Date | null, Date | null, Date>
type TokenExpiresAt = Date | null
type TokenRevokedAt = ColumnType<Date | null, Date | null, Date>



// Table Interfaces: Each interface describes one table in DB

export interface DepartmentTable {
  id: Generated<DepartmentId>
  name: string
  code: string

  hodId: TeacherId | null

  serverId: ServerId
}

export type Department = Selectable<DepartmentTable>
export type NewDepartment = Insertable<DepartmentTable>
export type UpdateDepartment = Updateable<DepartmentTable>

export interface DisciplineTable {
  value: DisciplineValue
  label: string
}

export type Discipline = Selectable<DisciplineTable>
export type NewDiscipline = Insertable<DisciplineTable>
export type UpdateDiscipline = Updateable<DisciplineTable>

export interface ProgramTable {
  id: Generated<ProgramId>

  departmentId: DepartmentId
  discipline: DisciplineValue
  degreeLevel: DegreeLevel

  programDirectorId: TeacherId

  semesters: number
  code: string
}

export type Program = Selectable<ProgramTable>
export type NewProgram = Insertable<ProgramTable>
export type UpdateProgram = Updateable<ProgramTable>

export interface ProgramCurriculumTable {
  id: Generated<number>

  programId: ProgramId
  courseId: CourseId
  semesterNumber: number
  batchYear: number
}

export type ProgramCurriculum = Selectable<ProgramCurriculumTable>
export type NewProgramCurriculum = Insertable<ProgramCurriculumTable>
export type UpdateProgramCurriculum = Updateable<ProgramCurriculumTable>

export interface UserTypeTable {
  value: UserTypeValue
  label: string
  description: string | null
}

export type UserType = Selectable<UserTypeTable>
export type NewUserType = Insertable<UserTypeTable>
export type UpdateUserType = Updateable<UserTypeTable>

export interface UserTable {
  id: Generated<UserId>
  publicId: ColumnType<string, never, never>

  fullName: string
  personalEmail: string
  universityEmail: string | null
  phone: string
  passwordHash: string

  gender: Gender
  profilePictureUrl: string | null
  bio: string | null

  isDeleted: Generated<boolean>
  deletedBy: UserId | null
  deletedAt: DeletedAt

  createdAt: CreatedAt
  updatedAt: UpdatedAt
}

export type User = Selectable<UserTable>
export type NewUser = Insertable<UserTable>
export type UpdateUser = Updateable<UserTable>

export interface UserTypeAssignmentTable {
  userId: UserId
  type: UserTypeValue
}

export type UserTypeAssignment = Selectable<UserTypeAssignmentTable>
export type NewUserTypeAssignment = Insertable<UserTypeAssignmentTable>
export type UpdateUserTypeAssignment = Updateable<UserTypeAssignmentTable>

export interface StudentTable {
  studentId: StudentId
  classId: ClassId
  rollNumber: number
}

export type Student = Selectable<StudentTable>
export type NewStudent = Insertable<StudentTable>
export type UpdateStudent = Updateable<StudentTable>

export interface DesignationTable {
  value: DesignationValue
  label: string
  description: string | null
}

export type Designation = Selectable<DesignationTable>
export type NewDesignation = Insertable<DesignationTable>
export type UpdateDesignation = Updateable<DesignationTable>

export interface TeacherTable {
  teacherId: TeacherId
  departmentId: DepartmentId
  designation: DesignationValue
}

export type Teacher = Selectable<TeacherTable>
export type NewTeacher = Insertable<TeacherTable>
export type UpdateTeacher = Updateable<TeacherTable>

export interface ClassTable {
  id: Generated<ClassId>
  publicId: ColumnType<string, never, never>

  programId: ProgramId
  currentSemester: number
  section: ClassSection

  crId: StudentId | null

  academicYear: number
  admissionYear: number

  serverId: ServerId
}

export type Class = Selectable<ClassTable>
export type NewClass = Insertable<ClassTable>
export type UpdateClass = Updateable<ClassTable>

export interface SocietyTable {
  id: Generated<SocietyId>
  publicId: ColumnType<string, never, never>

  name: string
  description: string | null

  departmentId: DepartmentId
  presidentId: StudentId
  convenorId: TeacherId
  serverId: ServerId

  isDeleted: Generated<boolean>
  deletedBy: UserId | null
  deletedAt: DeletedAt

  createdAt: CreatedAt
}

export type Society = Selectable<SocietyTable>
export type NewSociety = Insertable<SocietyTable>
export type UpdateSociety = Updateable<SocietyTable>

export interface ServerTypeTable {
  value: ServerTypeValue
  label: string
  description: string | null
}

export type ServerType = Selectable<ServerTypeTable>
export type NewServerType = Insertable<ServerTypeTable>
export type UpdateServerType = Updateable<ServerTypeTable>

export interface ServerTable {
  id: Generated<ServerId>
  publicId: ColumnType<string, never, never>

  name: string
  description: string | null
  iconUrl: string | null

  type: ServerTypeValue

  isDeleted: Generated<boolean>
  deletedBy: UserId | null
  deletedAt: DeletedAt

  createdBy: UserId | null
  createdAt: CreatedAt
}

export type Server = Selectable<ServerTable>
export type NewServer = Insertable<ServerTable>
export type UpdateServer = Updateable<ServerTable>

export interface ChannelTypeTable {
  value: ChannelTypeValue
  label: string
  description: string | null
}

export type ChannelType = Selectable<ChannelTypeTable>
export type NewChannelType = Insertable<ChannelTypeTable>
export type UpdateChannelType = Updateable<ChannelTypeTable>

export interface ChannelTable {
  id: Generated<ChannelId>
  publicId: ColumnType<string, never, never>

  name: string
  description: string | null

  type: ChannelTypeValue

  serverId: ServerId

  courseId: CourseId | null

  programId: ProgramId | null

  isLocked: Generated<boolean>
  lockedBy: UserId | null
  lockedAt: LockedAt

  isArchived: Generated<boolean>
  archivedBy: UserId | null
  archivedAt: ArchivedAt

  isDeleted: Generated<boolean>
  deletedBy: UserId | null
  deletedAt: DeletedAt

  isAutoCreated: Generated<boolean>
  createdBy: UserId | null
  createdAt: CreatedAt
}

export type Channel = Selectable<ChannelTable>
export type NewChannel = Insertable<ChannelTable>
export type UpdateChannel = Updateable<ChannelTable>

export interface ServerMembershipTable {
  userId: UserId
  serverId: ServerId

  joinedAt: ServerJoinedAt
  isAutoJoined: Generated<boolean>
}

export type ServerMembership = Selectable<ServerMembershipTable>
export type NewServerMembership = Insertable<ServerMembershipTable>
export type UpdateServerMembership = Updateable<ServerMembershipTable>

export interface SocietyMembershipRequestTable {
  id: Generated<number>

  societyId: SocietyId
  userId: UserId

  status: MembershipRequestStatus

  requestedAt: MembershipRequestedAt

  isReviewed: Generated<boolean>
  reviewedBy: UserId | null
  reviewedAt: RequestReviewedAt
}

export type SocietyMembershipRequest = Selectable<SocietyMembershipRequestTable>
export type NewSocietyMembershipRequest = Insertable<SocietyMembershipRequestTable>
export type UpdateSocietyMembershipRequest = Updateable<SocietyMembershipRequestTable>

export interface CourseTable {
  id: Generated<CourseId>

  title: string
  code: string
  creditHours: number

  departmentId: DepartmentId
}

export type Course = Selectable<CourseTable>
export type NewCourse = Insertable<CourseTable>
export type UpdateCourse = Updateable<CourseTable>

export interface CourseAssignmentTable {
  teacherId: TeacherId
  courseId: CourseId
  classId: ClassId
}

export type CourseAssignment = Selectable<CourseAssignmentTable>
export type NewCourseAssignment = Insertable<CourseAssignmentTable>
export type UpdateCourseAssignment = Updateable<CourseAssignmentTable>

export interface PostTable {
  id: Generated<PostId>
  publicId: ColumnType<string, never, never>

  title: string
  content: string

  channelId: ChannelId

  priority: PostPriority

  isPinned: Generated<boolean>
  pinnedBy: UserId | null
  pinnedAt: PostPinnedAt

  isDeleted: Generated<boolean>
  deletedBy: UserId | null
  deletedAt: DeletedAt

  createdBy: UserId
  createdAt: CreatedAt

  isEdited: Generated<boolean>
  editedBy: UserId | null
  editedAt: EditedAt
}

export type Post = Selectable<PostTable>
export type NewPost = Insertable<PostTable>
export type UpdatePost = Updateable<PostTable>

export interface PostAttachmentTypeTable {
  value: PostAttachmentTypeValue
  maxSizeBytes: number
}

export type PostAttachmentType = Selectable<PostAttachmentTypeTable>
export type NewPostAttachmentType = Insertable<PostAttachmentTypeTable>
export type UpdatePostAttachmentType = Updateable<PostAttachmentTypeTable>

export interface PostAttachmentTable {
  id: Generated<number>

  postId: PostId

  attachmentUrl: string

  type: PostAttachmentTypeValue

  uploadedAt: UploadedAt
}

export type PostAttachment = Selectable<PostAttachmentTable>
export type NewPostAttachment = Insertable<PostAttachmentTable>
export type UpdatePostAttachment = Updateable<PostAttachmentTable>

export interface UserRoleTable {
  value: UserRoleValue
  label: string
  description: string | null
}

export type UserRole = Selectable<UserRoleTable>
export type NewUserRole = Insertable<UserRoleTable>
export type UpdateUserRole = Updateable<UserRoleTable>

export interface PermissionTable {
  id: Generated<PermissionId>

  action: string
  resource: string
}

export type Permission = Selectable<PermissionTable>
export type NewPermission = Insertable<PermissionTable>
export type UpdatePermission = Updateable<PermissionTable>

export interface UserRolePermissionTable {
  role: UserRoleValue
  permissionId: PermissionId
}

export type UserRolePermission = Selectable<UserRolePermissionTable>
export type NewUserRolePermission = Insertable<UserRolePermissionTable>
export type UpdateUserRolePermission = Updateable<UserRolePermissionTable>

export interface UserRoleAssignmentTable {
  id: Generated<number>

  userId: UserId
  role: UserRoleValue

  serverId: ServerId | null
  channelId: ChannelId | null

  assignedBy: UserId | null
  assignedAt: RoleAssignedAt
  expiresAt: Date | null
}

export type UserRoleAssignment = Selectable<UserRoleAssignmentTable>
export type NewUserRoleAssignment = Insertable<UserRoleAssignmentTable>
export type UpdateUserRoleAssignment = Updateable<UserRoleAssignmentTable>

export interface NotificationTypeTable {
  value: NotificationTypeValue
  label: string
}

export type NotificationType = Selectable<NotificationTypeTable>
export type NewNotificationType = Insertable<NotificationTypeTable>
export type UpdateNotificationType = Updateable<NotificationTypeTable>

export interface NotificationTable {
  id: Generated<number>

  title: string
  message: string | null

  type: NotificationTypeValue

  userId: UserId

  postId: PostId | null

  readAt: NotificationReadAt
  createdAt: CreatedAt
}

export type Notification = Selectable<NotificationTable>
export type NewNotification = Insertable<NotificationTable>
export type UpdateNotification = Updateable<NotificationTable>

export interface NotificationPreferenceTable {
  id: Generated<number>

  userId: UserId

  scope: NotificationScope

  serverId: ServerId | null
  channelId: ChannelId | null

  isSubscribed: Generated<boolean>

  updatedAt: UpdatedAt
}

export type NotificationPreference = Selectable<NotificationPreferenceTable>
export type NewNotificationPreference = Insertable<NotificationPreferenceTable>
export type UpdateNotificationPreference = Updateable<NotificationPreferenceTable>

export interface RefreshTokenTable {
  id: Generated<number>

  userId: UserId

  tokenHash: string

  expiresAt: TokenExpiresAt
  createdAt: CreatedAt
  revokedAt: TokenRevokedAt
}

export type RefreshToken = Selectable<RefreshTokenTable>
export type NewRefreshToken = Insertable<RefreshTokenTable>
export type UpdateRefreshToken = Updateable<RefreshTokenTable>
