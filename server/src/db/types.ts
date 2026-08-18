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
  UserTypeValue,
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

export type DepartmentEntity = Selectable<DepartmentTable>
export type InsertDepartmentEntity = Insertable<DepartmentTable>
export type UpdateDepartmentEntity = Updateable<DepartmentTable>

export interface DisciplineTable {
  value: string
  label: string
}

export type DisciplineEntity = Selectable<DisciplineTable>
export type InsertDisciplineEntity = Insertable<DisciplineTable>
export type UpdateDisciplineEntity = Updateable<DisciplineTable>

export interface ProgramTable {
  id: Generated<number>

  departmentId: number
  discipline: string
  degreeLevel: DegreeLevel

  programDirectorId: number

  totalSemesters: number
  code: string
}

export type ProgramEntity = Selectable<ProgramTable>
export type InsertProgramEntity = Insertable<ProgramTable>
export type UpdateProgramEntity = Updateable<ProgramTable>

export interface ProgramCurriculumTable {
  id: Generated<number>

  programId: number
  courseId: number
  semesterNumber: number
  batchYear: number
}

export type ProgramCurriculumEntity = Selectable<ProgramCurriculumTable>
export type InsertProgramCurriculumEntity = Insertable<ProgramCurriculumTable>
export type UpdateProgramCurriculumEntity = Updateable<ProgramCurriculumTable>

export interface UserTypeTable {
  value: UserTypeValue
  label: string
  description: string | null
}

export type UserTypeEntity = Selectable<UserTypeTable>
export type InsertUserTypeEntity = Insertable<UserTypeTable>
export type UpdateUserTypeEntity = Updateable<UserTypeTable>

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

export type UserEntity = Selectable<UserTable>
export type InsertUserEntity = Insertable<UserTable>
export type UpdateUserEntity = Updateable<UserTable>

export interface UserTypeAssignmentTable {
  userId: number
  type: UserTypeValue
}

export type UserTypeAssignmentEntity = Selectable<UserTypeAssignmentTable>
export type InsertUserTypeAssignmentEntity = Insertable<UserTypeAssignmentTable>
export type UpdateUserTypeAssignmentEntity = Updateable<UserTypeAssignmentTable>

export interface StudentTable {
  studentId: number
  classId: number
  rollNumber: string
}

export type StudentEntity = Selectable<StudentTable>
export type InsertStudentEntity = Insertable<StudentTable>
export type UpdateStudentEntity = Updateable<StudentTable>

export interface DesignationTable {
  value: string
  label: string
  description: string | null
}

export type DesignationEntity = Selectable<DesignationTable>
export type InsertDesignationEntity = Insertable<DesignationTable>
export type UpdateDesignationEntity = Updateable<DesignationTable>

export interface TeacherTable {
  teacherId: number
  departmentId: number
  designation: string
}

export type TeacherEntity = Selectable<TeacherTable>
export type InsertTeacherEntity = Insertable<TeacherTable>
export type UpdateTeacherEntity = Updateable<TeacherTable>

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

export type ClassEntity = Selectable<ClassTable>
export type InsertClassEntity = Insertable<ClassTable>
export type UpdateClassEntity = Updateable<ClassTable>

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

export type SocietyEntity = Selectable<SocietyTable>
export type InsertSocietyEntity = Insertable<SocietyTable>
export type UpdateSocietyEntity = Updateable<SocietyTable>

export interface ServerTypeTable {
  value: ServerTypeValue
  label: string
  description: string | null
}

export type ServerTypeEntity = Selectable<ServerTypeTable>
export type InsertServerTypeEntity = Insertable<ServerTypeTable>
export type UpdateServerTypeEntity = Updateable<ServerTypeTable>

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

export type ServerEntity = Selectable<ServerTable>
export type InsertServerEntity = Insertable<ServerTable>
export type UpdateServerEntity = Updateable<ServerTable>

export interface ChannelTypeTable {
  value: ChannelTypeValue
  label: string
  description: string | null
}

export type ChannelTypeEntity = Selectable<ChannelTypeTable>
export type InsertChannelTypeEntity = Insertable<ChannelTypeTable>
export type UpdateChannelTypeEntity = Updateable<ChannelTypeTable>

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

export type ChannelEntity = Selectable<ChannelTable>
export type InsertChannelEntity = Insertable<ChannelTable>
export type UpdateChannelEntity = Updateable<ChannelTable>

export interface ServerMembershipTable {
  userId: number
  serverId: number

  joinedAt: ServerJoinedAt
  isAutoJoined: Generated<boolean>
}

export type ServerMembershipEntity = Selectable<ServerMembershipTable>
export type InsertServerMembershipEntity = Insertable<ServerMembershipTable>
export type UpdateServerMembershipEntity = Updateable<ServerMembershipTable>

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

export type SocietyMembershipRequestEntity = Selectable<SocietyMembershipRequestTable>
export type InsertSocietyMembershipRequestEntity = Insertable<SocietyMembershipRequestTable>
export type UpdateSocietyMembershipRequestEntity = Updateable<SocietyMembershipRequestTable>

export interface CourseTable {
  id: Generated<number>

  title: string
  code: string
  creditHours: number

  departmentId: number
}

export type CourseEntity = Selectable<CourseTable>
export type InsertCourseEntity = Insertable<CourseTable>
export type UpdateCourseEntity = Updateable<CourseTable>

export interface CourseAssignmentTable {
  teacherId: number
  courseId: number
  classId: number
}

export type CourseAssignmentEntity = Selectable<CourseAssignmentTable>
export type InsertCourseAssignmentEntity = Insertable<CourseAssignmentTable>
export type UpdateCourseAssignmentEntity = Updateable<CourseAssignmentTable>

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

export type PostEntity = Selectable<PostTable>
export type InsertPostEntity = Insertable<PostTable>
export type UpdatePostEntity = Updateable<PostTable>

export interface PostAttachmentTypeTable {
  value: PostAttachmentTypeValue
  label: string
  maxSizeBytes: number
}

export type PostAttachmentTypeEntity = Selectable<PostAttachmentTypeTable>
export type InsertPostAttachmentTypeEntity = Insertable<PostAttachmentTypeTable>
export type UpdatePostAttachmentTypeEntity = Updateable<PostAttachmentTypeTable>

export interface PostAttachmentTable {
  id: Generated<number>

  postId: number

  attachmentUrl: string

  type: PostAttachmentTypeValue

  uploadedAt: UploadedAt
}

export type PostAttachmentEntity = Selectable<PostAttachmentTable>
export type InsertPostAttachmentEntity = Insertable<PostAttachmentTable>
export type UpdatePostAttachmentEntity = Updateable<PostAttachmentTable>

export interface UserRoleTable {
  value: string
  label: string
  description: string | null
}

export type UserRoleEntity = Selectable<UserRoleTable>
export type InsertUserRoleEntity = Insertable<UserRoleTable>
export type UpdateUserRoleEntity = Updateable<UserRoleTable>

export interface PermissionTable {
  id: Generated<number>

  action: string
  resource: string
}

export type PermissionEntity = Selectable<PermissionTable>
export type InsertPermissionEntity = Insertable<PermissionTable>
export type UpdatePermissionEntity = Updateable<PermissionTable>

export interface UserRolePermissionTable {
  role: string
  permissionId: number
}

export type UserRolePermissionEntity = Selectable<UserRolePermissionTable>
export type InsertUserRolePermissionEntity = Insertable<UserRolePermissionTable>
export type UpdateUserRolePermissionEntity = Updateable<UserRolePermissionTable>

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

export type UserRoleAssignmentEntity = Selectable<UserRoleAssignmentTable>
export type InsertUserRoleAssignmentEntity = Insertable<UserRoleAssignmentTable>
export type UpdateUserRoleAssignmentEntity = Updateable<UserRoleAssignmentTable>

export interface NotificationTypeTable {
  value: NotificationTypeValue
  label: string
}

export type NotificationTypeEntity = Selectable<NotificationTypeTable>
export type InsertNotificationTypeEntity = Insertable<NotificationTypeTable>
export type UpdateNotificationTypeEntity = Updateable<NotificationTypeTable>

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

export type NotificationEntity = Selectable<NotificationTable>
export type InsertNotificationEntity = Insertable<NotificationTable>
export type UpdateNotificationEntity = Updateable<NotificationTable>

export interface NotificationPreferenceTable {
  id: Generated<number>

  userId: number

  scope: NotificationScope

  serverId: number | null
  channelId: number | null

  isSubscribed: Generated<boolean>

  updatedAt: UpdatedAt
}

export type NotificationPreferenceEntity = Selectable<NotificationPreferenceTable>
export type InsertNotificationPreferenceEntity = Insertable<NotificationPreferenceTable>
export type UpdateNotificationPreferenceEntity = Updateable<NotificationPreferenceTable>

export interface RefreshTokenTable {
  id: Generated<number>

  userId: number

  tokenHash: string

  expiresAt: TokenExpiresAt
  createdAt: CreatedAt
  revokedAt: TokenRevokedAt
}

export type RefreshTokenEntity = Selectable<RefreshTokenTable>
export type InsertRefreshTokenEntity = Insertable<RefreshTokenTable>
export type UpdateRefreshTokenEntity = Updateable<RefreshTokenTable>