
import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely'

// What are branded ID Types? I got suggestion to use them in my kysley types.

// Literal Types
export type DegreeLevel = 'bachelors' | 'masters' | 'phd'
export type Discipline = 'computer_science' | 'software_engineering' | 'artificial_intelligence' | 'computer_engineering'
export type UserType = 'student' | 'teacher' | 'admin'
export type Gender = 'male' | 'female'
export type TeacherDesignation = 'lab_incharge' | 'lecturer' | 'assistant_professor'
export type ClassSection = 'a' | 'b'
export type ServerType = 'class' | 'society' | 'department'
export type ChannelType = 'announcements' | 'program' | 'course' | 'general'
export type MembershipRequestStatus = 'pending' | 'rejected' | 'approved'
export type PostPriority = 'normal' | 'important' | 'urgent'
export type FileAttachmentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/jpg' | 'application/pdf' | 'application/msword'
export type UserRole = 'cr' | 'society_president' | 'society_convenor' | 'program_director' | 'hod' | 'moderator'
export type Action = 'create' | 'update' | 'delete' | 'post' | 'assign'
export type Resource = 'channel' | 'society' | 'class' | 'role'
export type UserPermission = 'post:channel' | 'create:channel' | 'delete:channel' | 'update:channel' | 'create:society' | 'create:class' | 'assign:program_director' | 'assign:society_convenor' | 'assign:society_president' | 'assign:moderator' | 'assign:cr'
export type ModeratorScopeType = 'channel' | 'server'
export type NotificationType = 'new_post' | 'role_assigned'
export type NotificationPreferenceScope = 'server' | 'channel'

// Main Database Interface
export interface Database {
  departments: DepartmentTable
  programs: ProgramTable
  program_curricula: ProgramCurriculumTable
  users: UserTable
  students: StudentTable
  teachers: TeacherTable
  classes: ClassTable
  societies: SocietyTable
  servers: ServerTable
  channels: ChannelTable
  server_memberships: ServerMembershipTable
  society_membership_requests: SocietyMembershipRequestTable
  courses: CourseTable
  course_assignments: CourseAssignmentTable
  posts: PostTable
  post_attachments: PostAttachmentTable
  roles: RoleTable
  permissions: PermissionTable
  role_permissions: RolePermissionTable
  moderator_assignments: ModeratorAssignmentTable
  notifications: NotificationTable
  notification_preferences: NotificationPreferenceTable
  refresh_tokens: RefreshTokenTable
}

// Types for Audit Fields

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
type NotificationReadAt = ColumnType<Date | null, Date | undefined | null, Date>
type TokenExpiresAt = Date
type TokenRevokedAt = ColumnType<Date | null, Date | null, Date>


// Table Interfaces: Each interface describes one table in DB
export interface DepartmentTable {
  id: Generated<number>
  name: string
  code: string

  hod_id: number | null

  server_id: number
}

export type Department = Selectable<DepartmentTable>
export type NewDepartment = Insertable<DepartmentTable>
export type UpdateDepartment = Updateable<DepartmentTable>

export interface ProgramTable {
  id: Generated<number>

  department_id: number
  discipline: Discipline
  degree_level: DegreeLevel

  program_director_id: number

  semesters: number
  code: string
}

export type Program = Selectable<ProgramTable>
export type NewProgram = Insertable<ProgramTable>
export type UpdateProgram = Updateable<ProgramTable>

export interface ProgramCurriculumTable {
  id: Generated<number>

  program_id: number
  course_id: number
  semester_number: number
  batch_year: number
}

export type ProgramCurriculum = Selectable<ProgramCurriculumTable>
export type NewProgramCurriculum = Insertable<ProgramCurriculumTable>
export type UpdateProgramCurriculum = Updateable<ProgramCurriculumTable>

export interface UserTable {
  id: Generated<number>
  public_id: ColumnType<string, never, never>

  full_name: string
  email: string
  phone: string
  password_hash: string

  gender: Gender
  profile_picture_url: string | null
  bio: string | null

  type: UserType
  department_id: number | null

  is_active: Generated<boolean>
  created_at: CreatedAt
  updated_at: UpdatedAt
}

export type User = Selectable<UserTable>
export type NewUser = Insertable<UserTable>
export type UpdateUser = Updateable<UserTable>

export interface StudentTable {
  student_id: number
  class_id: number
  roll_number: number
}

export type Student = Selectable<StudentTable>
export type NewStudent = Insertable<StudentTable>
export type UpdateStudent = Updateable<StudentTable>

export interface TeacherTable {
  teacher_id: number
  designation: TeacherDesignation
}

export type Teacher = Selectable<TeacherTable>
export type NewTeacher = Insertable<TeacherTable>
export type UpdateTeacher = Updateable<TeacherTable>

export interface ClassTable {
  id: Generated<number>
  public_id: ColumnType<string, never, never>

  program_id: number
  current_semester: number
  section: ClassSection

  cr_id: number | null

  academic_year: number
  admission_year: number

  server_id: number
}

export type Class = Selectable<ClassTable>
export type NewClass = Insertable<ClassTable>
export type UpdateClass = Updateable<ClassTable>

export interface SocietyTable {
  id: Generated<number>
  public_id: ColumnType<string, never, never>

  name: string
  description: string | null

  department_id: number
  president_id: number
  convenor_id: number
  server_id: number

  is_active: Generated<boolean>
  created_at: CreatedAt
}

export type Society = Selectable<SocietyTable>
export type NewSociety = Insertable<SocietyTable>
export type UpdateSociety = Updateable<SocietyTable>

export interface ServerTable {
  id: Generated<number>
  public_id: ColumnType<string, never, never>

  name: string
  description: string | null
  icon_url: string | null

  type: ServerType

  is_active: Generated<boolean>
  created_by: number
  created_at: CreatedAt
}

export type Server = Selectable<ServerTable>
export type NewServer = Insertable<ServerTable>
export type UpdateServer = Updateable<ServerTable>

export interface ChannelTable {
  id: Generated<number>
  public_id: ColumnType<string, never, never>

  name: string
  description: string | null
  type: ChannelType

  server_id: number

  course_id: number | null

  program_id: number | null

  is_locked: Generated<boolean>
  locked_by: number | null
  locked_at: LockedAt

  is_archived: Generated<boolean>
  archived_by: number | null
  archived_at: ArchivedAt

  is_deleted: Generated<boolean>
  deleted_by: number | null
  deleted_at: DeletedAt

  is_auto_created: Generated<boolean>
  created_by: number | null
  created_at: CreatedAt
}

export type Channel = Selectable<ChannelTable>
export type NewChannel = Insertable<ChannelTable>
export type UpdateChannel = Updateable<ChannelTable>

export interface ServerMembershipTable {
  user_id: number
  server_id: number

  joined_at: ServerJoinedAt
  is_auto_joined: boolean
}

export type ServerMembership = Selectable<ServerMembershipTable>
export type NewServerMembership = Insertable<ServerMembershipTable>
export type UpdateServerMembership = Updateable<ServerMembershipTable>

export interface SocietyMembershipRequestTable {
  id: Generated<number>
  public_id: ColumnType<string, never, never>

  society_id: number
  user_id: number

  status: MembershipRequestStatus

  requested_at: MembershipRequestedAt
  reviewed_by: number | null
  reviewed_at: RequestReviewedAt
}

export type SocietyMembershipRequest = Selectable<SocietyMembershipRequestTable>
export type NewSocietyMembershipRequest = Insertable<SocietyMembershipRequestTable>
export type UpdateSocietyMembershipRequest = Updateable<SocietyMembershipRequestTable>

export interface CourseTable {
  id: Generated<number>

  title: string
  code: string
  credit_hours: number

  department_id: number
}

export type Course = Selectable<CourseTable>
export type NewCourse = Insertable<CourseTable>
export type UpdateCourse = Updateable<CourseTable>

export interface CourseAssignmentTable {
  teacher_id: number
  course_id: number
  class_id: number
}

export type CourseAssignment = Selectable<CourseAssignmentTable>
export type NewCourseAssignment = Insertable<CourseAssignmentTable>
export type UpdateCourseAssignment = Updateable<CourseAssignmentTable>

export interface PostTable {
  id: Generated<number>
  public_id: ColumnType<string, never, never>

  title: string
  content: string

  channel_id: number

  priority: Generated<PostPriority>

  is_pinned: Generated<boolean>
  pinned_by: number | null
  pinned_at: PostPinnedAt

  is_deleted: Generated<boolean>
  deleted_by: number | null
  deleted_at: PostDeletedAt

  created_by: number
  created_at: CreatedAt

  updated_by: number | null
  updated_at: UpdatedAt
}

export type Post = Selectable<PostTable>
export type NewPost = Insertable<PostTable>
export type UpdatePost = Updateable<PostTable>

export interface PostAttachmentTable {
  id: Generated<number>

  post_id: number

  file_url: string
  file_type: FileAttachmentType
  file_size: number

  uploaded_at: UploadedAt
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
  role_id: number
  permission_id: number
}

export type RolePermission = Selectable<RolePermissionTable>
export type NewRolePermission = Insertable<RolePermissionTable>
export type UpdateRolePermission = Updateable<RolePermissionTable>

export interface ModeratorAssignmentTable {
  id: Generated<number>

  user_id: number

  scope_type: ModeratorScopeType

  server_id: number
  channel_id: number | null

  assigned_by: number
  assigned_at: RoleAssignedAt
}

export type ModeratorAssignment = Selectable<ModeratorAssignmentTable>
export type NewModeratorAssignment = Insertable<ModeratorAssignmentTable>
export type UpdateModeratorAssignment = Updateable<ModeratorAssignmentTable>

export interface NotificationTable {
  id: Generated<number>
  public_id: ColumnType<string, never, never>

  title: string
  message: string | null

  type: NotificationType

  user_id: number

  post_id: number | null

  read_at: NotificationReadAt
  created_at: CreatedAt
}

export type Notification = Selectable<NotificationTable>
export type NewNotification = Insertable<NotificationTable>
export type UpdateNotification = Updateable<NotificationTable>

export interface NotificationPreferenceTable {
  id: Generated<number>

  user_id: number

  scope_type: NotificationPreferenceScope

  server_id: number | null
  channel_id: number | null

  is_subscribed: Generated<boolean>

  updated_at: UpdatedAt
}

export type NotificationPreference = Selectable<NotificationPreferenceTable>
export type NewNotificationPreference = Insertable<NotificationPreferenceTable>
export type UpdateNotificationPreference = Updateable<NotificationPreferenceTable>

export interface RefreshTokenTable {
  id: Generated<number>

  user_id: number

  token_hash: string

  expires_at: TokenExpiresAt
  created_at: CreatedAt
  revoked_at: TokenRevokedAt
}

export type RefreshToken = Selectable<RefreshTokenTable>
export type NewRefreshToken = Insertable<RefreshTokenTable>
export type UpdateRefreshToken = Updateable<RefreshTokenTable>