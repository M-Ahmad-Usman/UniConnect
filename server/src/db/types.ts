
import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely'

/* Developer Notes
Table and Column Naming:
  Tables and Field names use camelCase naming convention in this file.
  The actual casing in DB is snake_case.
  This project uses camelCase plugin to transform the naming.

Raw SQL Queries
  The camelCase plugin willn't transform camelCase names into snake_case on queries
  written in raw sql. Use actual snake_case names in raw queries.
*/

// Main Database Interface
export interface Database {
  departments: DepartmentTable
  programs: ProgramTable
  programCurricula: ProgramCurriculumTable
  users: UserTable
  students: StudentTable
  teachers: TeacherTable
  classes: ClassTable
  societies: SocietyTable
  servers: ServerTable
  channels: ChannelTable
  serverMemberships: ServerMembershipTable
  societyMembershipRequests: SocietyMembershipRequestTable
  courses: CourseTable
  courseAssignments: CourseAssignmentTable
  posts: PostTable
  postAttachments: PostAttachmentTable
  roles: RoleTable
  permissions: PermissionTable
  rolePermissions: RolePermissionTable
  moderatorAssignments: ModeratorAssignmentTable
  notifications: NotificationTable
  notificationPreferences: NotificationPreferenceTable
  refreshTokens: RefreshTokenTable
}

// Branded ID Types — phantom tags for type-safe table IDs (zero runtime cost)
type Brand<T, B> = T & { readonly __brand: B }

export type DepartmentId = Brand<number, 'DepartmentId'>
export type ProgramId = Brand<number, 'ProgramId'>
export type ProgramCurriculumId = Brand<number, 'ProgramCurriculumId'>
export type UserId = Brand<number, 'UserId'>
export type StudentId = Brand<number, 'StudentId'>
export type TeacherId = Brand<number, 'TeacherId'>
export type ClassId = Brand<number, 'ClassId'>
export type SocietyId = Brand<number, 'SocietyId'>
export type ServerId = Brand<number, 'ServerId'>
export type ChannelId = Brand<number, 'ChannelId'>
export type SocietyMembershipRequestId = Brand<number, 'SocietyMembershipRequestId'>
export type CourseId = Brand<number, 'CourseId'>
export type PostId = Brand<number, 'PostId'>
export type PostAttachmentId = Brand<number, 'PostAttachmentId'>
export type RoleId = Brand<number, 'RoleId'>
export type PermissionId = Brand<number, 'PermissionId'>
export type ModeratorAssignmentId = Brand<number, 'ModeratorAssignmentId'>
export type NotificationId = Brand<number, 'NotificationId'>
export type NotificationPreferenceId = Brand<number, 'NotificationPreferenceId'>
export type RefreshTokenId = Brand<number, 'RefreshTokenId'>

// Literal Types
export type DegreeLevel = 'bachelors' | 'masters' | 'phd'
export type Discipline = 'computer_science' | 'software_engineering' | 'artificial_intelligence' | 'computer_engineering'
export type UserType = 'student' | 'teacher' | 'admin'
export type Gender = 'male' | 'female'
export type TeacherDesignation = 'lab_incharge' | 'lecturer' | 'assistant_professor' | 'associate_professor' | 'professor'
export type ClassSection = 'a' | 'b'
export type ServerType = 'class' | 'society' | 'department'
export type ChannelType = 'announcements' | 'program' | 'course' | 'general'
export type MembershipRequestStatus = 'pending' | 'rejected' | 'approved'
export type PostPriority = 'normal' | 'important' | 'urgent'
export type FileAttachmentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/jpg' | 'application/pdf' | 'application/msword'
export type UserRole = 'cr' | 'society_president' | 'society_convenor' | 'program_director' | 'hod' | 'moderator'
export type Action = 'create' | 'update' | 'delete' | 'post' | 'assign'
export type Resource = 'channel' | 'society' | 'class' | 'role'
export type ModeratorScopeType = 'channel' | 'server'
export type NotificationType = 'new_post' | 'role_assigned'
export type NotificationPreferenceScope = 'server' | 'channel'

// Types for Timestamp related Audit fields

// Fields Controlled By DB Triggers
type CreatedAt = ColumnType<Date, never, never>
type LockedAt = ColumnType<Date | null, never, never>
type UpdatedAt = ColumnType<Date | null, never, never>
type ArchivedAt = ColumnType<Date | null, never, never>
type DeletedAt = ColumnType<Date | null, never, never>
type ServerJoinedAt = ColumnType<Date, never, never>
type MembershipRequestedAt = ColumnType<Date, never, never>
type RequestReviewedAt = ColumnType<Date | null, never, never>
type PostPinnedAt = ColumnType<Date | null, never, never>
type PostDeletedAt = ColumnType<Date | null, never, never>
type UploadedAt = ColumnType<Date, never, never>
type RoleAssignedAt = ColumnType<Date, never, never>

// Fields Controlled by App Layer
type NotificationReadAt = ColumnType<Date | null, Date | null, Date>
type TokenExpiresAt = Date
type TokenRevokedAt = ColumnType<Date | null, Date | null, Date>


// Table Interfaces: Each interface describes one table in DB
export interface DepartmentTable {
  id: Generated<number>
  name: string
  code: string

  hodId: UserId | null

  serverId: ServerId
}

export type Department = Selectable<DepartmentTable>
export type NewDepartment = Insertable<DepartmentTable>
export type UpdateDepartment = Updateable<DepartmentTable>

export interface ProgramTable {
  id: Generated<number>

  departmentId: DepartmentId
  discipline: Discipline
  degreeLevel: DegreeLevel

  programDirectorId: UserId

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

export interface UserTable {
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  fullName: string
  email: string
  phone: string
  passwordHash: string

  gender: Gender
  profilePictureUrl: string | null
  bio: string | null

  type: UserType
  departmentId: DepartmentId | null

  isDeleted: Generated<boolean>
  deletedBy: UserId | null
  deletedAt: DeletedAt

  createdAt: CreatedAt
  updatedAt: UpdatedAt
}

export type User = Selectable<UserTable>
export type NewUser = Insertable<UserTable>
export type UpdateUser = Updateable<UserTable>

export interface StudentTable {
  studentId: UserId
  classId: ClassId
  rollNumber: number
}

export type Student = Selectable<StudentTable>
export type NewStudent = Insertable<StudentTable>
export type UpdateStudent = Updateable<StudentTable>

export interface TeacherTable {
  teacherId: UserId
  designation: TeacherDesignation
}

export type Teacher = Selectable<TeacherTable>
export type NewTeacher = Insertable<TeacherTable>
export type UpdateTeacher = Updateable<TeacherTable>

export interface ClassTable {
  id: Generated<number>
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
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  name: string
  description: string | null

  departmentId: DepartmentId
  presidentId: StudentId
  convenorId: TeacherId
  serverId: ServerId

  isActive: Generated<boolean>
  createdAt: CreatedAt
}

export type Society = Selectable<SocietyTable>
export type NewSociety = Insertable<SocietyTable>
export type UpdateSociety = Updateable<SocietyTable>

export interface ServerTable {
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  name: string
  description: string | null
  iconUrl: string | null

  type: ServerType

  isActive: Generated<boolean>
  createdBy: UserId
  createdAt: CreatedAt
}

export type Server = Selectable<ServerTable>
export type NewServer = Insertable<ServerTable>
export type UpdateServer = Updateable<ServerTable>

export interface ChannelTable {
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  name: string
  description: string | null
  type: ChannelType

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
  isAutoJoined: boolean
}

export type ServerMembership = Selectable<ServerMembershipTable>
export type NewServerMembership = Insertable<ServerMembershipTable>
export type UpdateServerMembership = Updateable<ServerMembershipTable>

export interface SocietyMembershipRequestTable {
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  societyId: SocietyId
  userId: UserId

  status: MembershipRequestStatus

  requestedAt: MembershipRequestedAt
  reviewedBy: UserId | null
  reviewedAt: RequestReviewedAt
}

export type SocietyMembershipRequest = Selectable<SocietyMembershipRequestTable>
export type NewSocietyMembershipRequest = Insertable<SocietyMembershipRequestTable>
export type UpdateSocietyMembershipRequest = Updateable<SocietyMembershipRequestTable>

export interface CourseTable {
  id: Generated<number>

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
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  title: string
  content: string

  channelId: ChannelId

  priority: Generated<PostPriority>

  isPinned: Generated<boolean>
  pinnedBy: UserId | null
  pinnedAt: PostPinnedAt

  isDeleted: Generated<boolean>
  deletedBy: UserId | null
  deletedAt: PostDeletedAt

  createdBy: UserId
  createdAt: CreatedAt

  updatedBy: UserId | null
  updatedAt: UpdatedAt
}

export type Post = Selectable<PostTable>
export type NewPost = Insertable<PostTable>
export type UpdatePost = Updateable<PostTable>

export interface PostAttachmentTable {
  id: Generated<number>

  postId: PostId

  fileUrl: string
  fileType: FileAttachmentType
  fileSize: number

  uploadedAt: UploadedAt
}

export type PostAttachment = Selectable<PostAttachmentTable>
export type NewPostAttachment = Insertable<PostAttachmentTable>
export type UpdatePostAttachment = Updateable<PostAttachmentTable>

export interface RoleTable {
  id: Generated<number>
  name: UserRole
}

export type Role = Selectable<RoleTable>
export type NewRole = Insertable<RoleTable>
export type UpdateRole = Updateable<RoleTable>

export interface PermissionTable {
  id: Generated<number>

  action: Action
  resource: Resource
}

export type Permission = Selectable<PermissionTable>
export type NewPermission = Insertable<PermissionTable>
export type UpdatePermission = Updateable<PermissionTable>

export interface RolePermissionTable {
  roleId: RoleId
  permissionId: PermissionId
}

export type RolePermission = Selectable<RolePermissionTable>
export type NewRolePermission = Insertable<RolePermissionTable>
export type UpdateRolePermission = Updateable<RolePermissionTable>

export interface ModeratorAssignmentTable {
  id: Generated<number>

  userId: UserId

  scopeType: ModeratorScopeType

  serverId: ServerId
  channelId: ChannelId | null

  assignedBy: UserId
  assignedAt: RoleAssignedAt
}

export type ModeratorAssignment = Selectable<ModeratorAssignmentTable>
export type NewModeratorAssignment = Insertable<ModeratorAssignmentTable>
export type UpdateModeratorAssignment = Updateable<ModeratorAssignmentTable>

export interface NotificationTable {
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  title: string
  message: string | null

  type: NotificationType

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

  scopeType: NotificationPreferenceScope

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
