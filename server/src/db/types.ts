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
  id: Generated<number>
  name: string
  code: string

  hodId: number | null

  serverId: number
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
  id: Generated<number>

  departmentId: number
  discipline: DisciplineValue
  degreeLevel: DegreeLevel

  programDirectorId: number

  semesters: number
  code: string
}

export type Program = Selectable<ProgramTable>
export type NewProgram = Insertable<ProgramTable>
export type UpdateProgram = Updateable<ProgramTable>

export interface ProgramCurriculumTable {
  id: Generated<number>

  programId: number
  courseId: number
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
  id: Generated<number>
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
  deletedBy: number | null
  deletedAt: DeletedAt

  createdAt: CreatedAt
  updatedAt: UpdatedAt
}

export type User = Selectable<UserTable>
export type NewUser = Insertable<UserTable>
export type UpdateUser = Updateable<UserTable>

export interface UserTypeAssignmentTable {
  userId: number
  type: UserTypeValue
}

export type UserTypeAssignment = Selectable<UserTypeAssignmentTable>
export type NewUserTypeAssignment = Insertable<UserTypeAssignmentTable>
export type UpdateUserTypeAssignment = Updateable<UserTypeAssignmentTable>

export interface StudentTable {
  studentId: number
  classId: number
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
  teacherId: number
  departmentId: number
  designation: DesignationValue
}

export type Teacher = Selectable<TeacherTable>
export type NewTeacher = Insertable<TeacherTable>
export type UpdateTeacher = Updateable<TeacherTable>

export interface ClassTable {
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  programId: number
  currentSemester: number
  section: ClassSection

  crId: number | null

  academicYear: number
  admissionYear: number

  serverId: number
}

export type Class = Selectable<ClassTable>
export type NewClass = Insertable<ClassTable>
export type UpdateClass = Updateable<ClassTable>

export interface SocietyTable {
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  name: string
  description: string | null

  departmentId: number
  presidentId: number
  convenorId: number
  serverId: number

  isDeleted: Generated<boolean>
  deletedBy: number | null
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
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  name: string
  description: string | null
  iconUrl: string | null

  type: ServerTypeValue

  isDeleted: Generated<boolean>
  deletedBy: number | null
  deletedAt: DeletedAt

  createdBy: number | null
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
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  name: string
  description: string | null

  type: ChannelTypeValue

  serverId: number

  courseId: number | null

  programId: number | null

  isLocked: Generated<boolean>
  lockedBy: number | null
  lockedAt: LockedAt

  isArchived: Generated<boolean>
  archivedBy: number | null
  archivedAt: ArchivedAt

  isDeleted: Generated<boolean>
  deletedBy: number | null
  deletedAt: DeletedAt

  isAutoCreated: Generated<boolean>
  createdBy: number | null
  createdAt: CreatedAt
}

export type Channel = Selectable<ChannelTable>
export type NewChannel = Insertable<ChannelTable>
export type UpdateChannel = Updateable<ChannelTable>

export interface ServerMembershipTable {
  userId: number
  serverId: number

  joinedAt: ServerJoinedAt
  isAutoJoined: Generated<boolean>
}

export type ServerMembership = Selectable<ServerMembershipTable>
export type NewServerMembership = Insertable<ServerMembershipTable>
export type UpdateServerMembership = Updateable<ServerMembershipTable>

export interface SocietyMembershipRequestTable {
  id: Generated<number>

  societyId: number
  userId: number

  status: MembershipRequestStatus

  requestedAt: MembershipRequestedAt

  isReviewed: Generated<boolean>
  reviewedBy: number | null
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

  departmentId: number
}

export type Course = Selectable<CourseTable>
export type NewCourse = Insertable<CourseTable>
export type UpdateCourse = Updateable<CourseTable>

export interface CourseAssignmentTable {
  teacherId: number
  courseId: number
  classId: number
}

export type CourseAssignment = Selectable<CourseAssignmentTable>
export type NewCourseAssignment = Insertable<CourseAssignmentTable>
export type UpdateCourseAssignment = Updateable<CourseAssignmentTable>

export interface PostTable {
  id: Generated<number>
  publicId: ColumnType<string, never, never>

  title: string
  content: string

  channelId: number

  priority: PostPriority

  isPinned: Generated<boolean>
  pinnedBy: number | null
  pinnedAt: PostPinnedAt

  isDeleted: Generated<boolean>
  deletedBy: number | null
  deletedAt: DeletedAt

  createdBy: number
  createdAt: CreatedAt

  isEdited: Generated<boolean>
  editedBy: number | null
  editedAt: EditedAt
}

export type Post = Selectable<PostTable>
export type NewPost = Insertable<PostTable>
export type UpdatePost = Updateable<PostTable>

export interface PostAttachmentTypeTable {
  value: PostAttachmentTypeValue
  label: string
  maxSizeBytes: number
}

export type PostAttachmentType = Selectable<PostAttachmentTypeTable>
export type NewPostAttachmentType = Insertable<PostAttachmentTypeTable>
export type UpdatePostAttachmentType = Updateable<PostAttachmentTypeTable>

export interface PostAttachmentTable {
  id: Generated<number>

  postId: number

  attachmentUrl: string

  type: PostAttachmentTypeValue

  uploadedAt: UploadedAt
}

export type PostAttachment = Selectable<PostAttachmentTable>
export type NewPostAttachment = Insertable<PostAttachmentTable>
export type UpdatePostAttachment = Updateable<PostAttachmentTable>

export interface UserRoleTable {
  value: string
  label: string
  description: string | null
}

export type UserRole = Selectable<UserRoleTable>
export type NewUserRole = Insertable<UserRoleTable>
export type UpdateUserRole = Updateable<UserRoleTable>

export interface PermissionTable {
  id: Generated<number>

  action: string
  resource: string
}

export type Permission = Selectable<PermissionTable>
export type NewPermission = Insertable<PermissionTable>
export type UpdatePermission = Updateable<PermissionTable>

export interface UserRolePermissionTable {
  role: string
  permissionId: number
}

export type UserRolePermission = Selectable<UserRolePermissionTable>
export type NewUserRolePermission = Insertable<UserRolePermissionTable>
export type UpdateUserRolePermission = Updateable<UserRolePermissionTable>

export interface UserRoleAssignmentTable {
  id: Generated<number>

  userId: number
  role: string

  serverId: number | null
  channelId: number | null

  assignedBy: number | null
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

  userId: number

  postId: number | null

  readAt: NotificationReadAt
  createdAt: CreatedAt
}

export type Notification = Selectable<NotificationTable>
export type NewNotification = Insertable<NotificationTable>
export type UpdateNotification = Updateable<NotificationTable>

export interface NotificationPreferenceTable {
  id: Generated<number>

  userId: number

  scope: NotificationScope

  serverId: number | null
  channelId: number | null

  isSubscribed: Generated<boolean>

  updatedAt: UpdatedAt
}

export type NotificationPreference = Selectable<NotificationPreferenceTable>
export type NewNotificationPreference = Insertable<NotificationPreferenceTable>
export type UpdateNotificationPreference = Updateable<NotificationPreferenceTable>

export interface RefreshTokenTable {
  id: Generated<number>

  userId: number

  tokenHash: string

  expiresAt: TokenExpiresAt
  createdAt: CreatedAt
  revokedAt: TokenRevokedAt
}

export type RefreshToken = Selectable<RefreshTokenTable>
export type NewRefreshToken = Insertable<RefreshTokenTable>
export type UpdateRefreshToken = Updateable<RefreshTokenTable>