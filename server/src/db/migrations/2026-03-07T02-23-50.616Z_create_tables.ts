/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Kysely } from 'kysely'
import { sql } from 'kysely'

// This migration will create all tables with the following constraints:
// 1. PRIMARY KEY
// 2. UNIQUE
// 3. NOT NULL

export async function up(db: Kysely<any>): Promise<void> {
  await createDepartmentsTable(db)
  await createProgramsTable(db)
  await createProgramCurriculaTable(db)
  await createUsersTable(db)
  await createStudentsTable(db)
  await createTeachersTable(db)
  await createClassesTable(db)
  await createSocietiesTable(db)
  await createServersTable(db)
  await createChannelsTable(db)
  await createServerMembershipsTable(db)
  await createSocietyMembershipRequestsTable(db)
  await createCoursesTable(db)
  await createCourseAssignmentsTable(db)
  await createPostsTable(db)
  await createPostAttachmentsTable(db)
  await createRolesTable(db)
  await createPermissionsTable(db)
  await createRolePermissionsTable(db)
  await createModeratorAssignmentsTable(db)
  await createNotificationsTable(db)
  await createNotificationPreferencesTable(db)
  await createRefreshTokensTable(db)
}

export async function down(db: Kysely<any>): Promise<void> {

  for (const tableName of Object.values(TABLENAMES).reverse())
    await db.schema
      .dropTable(tableName)
      .ifExists()
      .execute()
}

const TABLENAMES = {
  departments: 'departments',
  programs: 'programs',
  programCurricula: 'program_curricula',
  users: 'users',
  students: 'students',
  teachers: 'teachers',
  classes: 'classes',
  societies: 'societies',
  servers: 'servers',
  channels: 'channels',
  serverMemberships: 'server_memberships',
  societyMembershipRequests: 'society_membership_requests',
  courses: 'courses',
  courseAssignments: 'course_assignments',
  posts: 'posts',
  postAttachments: 'post_attachments',
  roles: 'roles',
  permissions: 'permissions',
  rolePermissions: 'role_permissions',
  moderatorAssignments: 'moderator_assignments',
  notifications: 'notifications',
  notificationPreferences: 'notification_preferences',
  refreshTokens: 'refresh_tokens',
} as const

// Dedicated Table Creation Functions

async function createDepartmentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.departments)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_department', ['id'])

    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addUniqueConstraint('uq_department_name', ['name'])

    .addColumn('code', 'varchar(20)', col => col.notNull())
    .addUniqueConstraint('uq_department_code', ['code'])

    .addColumn('hod_id', 'integer')
    .addUniqueConstraint('uq_department_hod_id', ['hod_id'])

    .addColumn('server_id', 'integer', col => col.notNull())
    .addUniqueConstraint('uq_department_server', ['server_id'])

    .execute()
}

async function createProgramsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.programs)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_program', ['id'])

    .addColumn('department_id', 'integer', col => col.notNull())
    .addColumn('discipline', sql`discipline`, col => col.notNull())
    .addColumn('degree_level', sql`degree_level`, col => col.notNull())

    .addColumn('program_director_id', 'integer', col => col.notNull())

    .addColumn('semesters', 'integer', col => col.notNull())

    .addColumn('code', 'varchar(20)', col => col.notNull())
    .addUniqueConstraint('uq_program_code', ['code'])

    .addUniqueConstraint('uq_program', ['department_id', 'discipline', 'degree_level'])

    .execute()
}

async function createProgramCurriculaTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.programCurricula)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_program_curriculum', ['id'])

    .addColumn('program_id', 'integer', col => col.notNull())
    .addColumn('course_id', 'integer', col => col.notNull())
    .addColumn('semester_number', 'integer', col => col.notNull())
    .addColumn('batch_year', 'integer', col => col.notNull())

    .addUniqueConstraint('uq_program_curriculum', ['program_id', 'course_id', 'semester_number', 'batch_year'])

    .execute()
}

async function createUsersTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.users)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_user', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('full_name', 'varchar(100)', col => col.notNull())

    .addColumn('email', 'varchar(255)', col => col.notNull())
    .addUniqueConstraint('uq_user_email', ['email'])

    .addColumn('phone', 'varchar(20)', col => col.notNull())
    .addColumn('password_hash', 'varchar(255)', col => col.notNull())

    .addColumn('gender', sql`gender`, col => col.notNull())
    .addColumn('profile_picture_url', 'text')
    .addColumn('bio', 'varchar(1000)')

    .addColumn('type', sql`user_type`, col => col.notNull())
    .addColumn('department_id', 'integer')

    .addColumn('is_deleted', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('deleted_by', 'integer')
    .addColumn('deleted_at', 'timestamptz')

    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz')

    .execute()
}

async function createStudentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.students)

    .addColumn('student_id', 'integer')
    .addPrimaryKeyConstraint('pk_student', ['student_id'])

    .addColumn('class_id', 'integer', col => col.notNull())

    .addColumn('roll_number', 'integer', col => col.notNull())
    .addUniqueConstraint('uq_student_roll_number', ['roll_number'])

    .execute()
}

async function createTeachersTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.teachers)

    .addColumn('teacher_id', 'integer')
    .addPrimaryKeyConstraint('pk_teacher', ['teacher_id'])

    .addColumn('designation', sql`teacher_designation`, col => col.notNull())

    .execute()
}

async function createClassesTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.classes)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_class', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('program_id', 'integer', col => col.notNull())
    .addColumn('current_semester', 'integer', col => col.notNull())
    .addColumn('section', sql`class_section`, col => col.notNull())

    .addColumn('cr_id', 'integer')
    .addUniqueConstraint('uq_class_cr', ['cr_id'])

    .addColumn('academic_year', 'integer', col => col.notNull())
    .addColumn('admission_year', 'integer', col => col.notNull())

    .addColumn('server_id', 'integer', col => col.notNull())
    .addUniqueConstraint('uq_class_server', ['server_id'])

    .addUniqueConstraint('uq_class', ['program_id', 'current_semester', 'section', 'admission_year'])
    .execute()
}

async function createSocietiesTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.societies)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_society', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addUniqueConstraint('uq_society_name', ['name'])

    .addColumn('description', 'varchar(1000)')

    .addColumn('department_id', 'integer', col => col.notNull())
    .addColumn('president_id', 'integer', col => col.notNull())
    .addColumn('convenor_id', 'integer', col => col.notNull())

    .addColumn('server_id', 'integer', col => col.notNull())
    .addUniqueConstraint('uq_society_server', ['server_id'])

    .addColumn('is_active', 'boolean', col => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()
}

async function createServersTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.servers)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_server', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addColumn('description', 'text')
    .addColumn('icon_url', 'text')

    .addColumn('type', sql`server_type`, col => col.notNull())

    .addColumn('is_active', 'boolean', col => col.notNull().defaultTo(true))
    .addColumn('created_by', 'integer')
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()
}

async function createChannelsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.channels)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_channel', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addColumn('description', 'varchar(200)')
    .addColumn('type', sql`channel_type`, col => col.notNull())

    .addColumn('server_id', 'integer', col => col.notNull())

    .addColumn('course_id', 'integer')

    .addColumn('program_id', 'integer')

    .addColumn('is_locked', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('locked_by', 'integer')
    .addColumn('locked_at', 'timestamptz')

    .addColumn('is_archived', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('archived_by', 'integer')
    .addColumn('archived_at', 'timestamptz')

    .addColumn('is_deleted', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('deleted_by', 'integer')
    .addColumn('deleted_at', 'timestamptz')

    .addColumn('is_auto_created', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('created_by', 'integer')
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .addUniqueConstraint('uq_channel_name_per_server', ['server_id', 'name'])

    .execute()
}

async function createServerMembershipsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.serverMemberships)

    .addColumn('user_id', 'integer')

    .addColumn('server_id', 'integer')
    .addPrimaryKeyConstraint('pk_server_membership', ['user_id', 'server_id'])

    .addColumn('joined_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('is_auto_joined', 'boolean', col => col.notNull())

    .execute()
}

async function createSocietyMembershipRequestsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.societyMembershipRequests)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_society_membership_request', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('society_id', 'integer', col => col.notNull())
    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('status', sql`membership_request_status`, col => col.notNull())

    .addColumn('requested_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('reviewed_by', 'integer')
    .addColumn('reviewed_at', 'timestamptz')

    .addUniqueConstraint('uq_society_membership_request', ['society_id', 'user_id'])

    .execute()
}

async function createCoursesTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.courses)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_course', ['id'])

    .addColumn('title', 'varchar(100)', col => col.notNull())

    .addColumn('code', 'varchar(50)', col => col.notNull())
    .addUniqueConstraint('uq_course_code', ['code'])

    .addColumn('credit_hours', 'integer', col => col.notNull())

    .addColumn('department_id', 'integer', col => col.notNull())

    .execute()
}

async function createCourseAssignmentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.courseAssignments)

    .addColumn('teacher_id', 'integer')
    .addColumn('course_id', 'integer')
    .addColumn('class_id', 'integer')

    .addPrimaryKeyConstraint('pk_course_assignment', ['teacher_id', 'course_id', 'class_id'])

    .execute()
}

async function createPostsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.posts)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_post', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('title', 'varchar(100)', col => col.notNull())
    .addColumn('content', 'text', col => col.notNull())

    .addColumn('channel_id', 'integer', col => col.notNull())

    .addColumn('priority', sql`post_priority`, col => col.notNull().defaultTo(sql`'normal'`))

    .addColumn('is_pinned', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('pinned_by', 'integer')
    .addColumn('pinned_at', 'timestamptz')

    .addColumn('is_deleted', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('deleted_by', 'integer')
    .addColumn('deleted_at', 'timestamptz')

    .addColumn('created_by', 'integer', col => col.notNull())
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .addColumn('updated_by', 'integer')
    .addColumn('updated_at', 'timestamptz')

    .execute()
}

async function createPostAttachmentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.postAttachments)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_post_attachment', ['id'])

    .addColumn('post_id', 'integer', col => col.notNull())

    .addColumn('file_url', 'text', col => col.notNull())
    .addColumn('file_type', sql`file_attachment_type`, col => col.notNull())
    .addColumn('file_size', 'integer', col => col.notNull())

    .addColumn('uploaded_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()
}

async function createRolesTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.roles)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_role', ['id'])

    .addColumn('name', sql`user_role`, col => col.notNull())
    .addUniqueConstraint('uq_role', ['name'])

    .execute()
}

async function createPermissionsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.permissions)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_permission', ['id'])

    .addColumn('action', sql`action`, col => col.notNull())
    .addColumn('resource', sql`resource`, col => col.notNull())

    .addUniqueConstraint('uq_permission', ['action', 'resource'])

    .execute()
}

async function createRolePermissionsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.rolePermissions)

    .addColumn('role_id', 'integer')
    .addColumn('permission_id', 'integer')

    .addPrimaryKeyConstraint('pk_role_permission', ['role_id', 'permission_id'])

    .execute()
}

async function createModeratorAssignmentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.moderatorAssignments)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_moderator_assignment', ['id'])

    .addColumn('user_id', 'integer', col => col.notNull())
    .addColumn('scope_type', sql`moderator_scope_type`, col => col.notNull())

    .addColumn('server_id', 'integer', col => col.notNull())
    .addColumn('channel_id', 'integer')

    .addColumn('assigned_by', 'integer')
    .addColumn('assigned_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()

  await sql`ALTER TABLE moderator_assignments 
  ADD CONSTRAINT uq_moderator_assignment 
  UNIQUE NULLS NOT DISTINCT (user_id, server_id, channel_id)`.execute(db)
}

async function createNotificationsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.notifications)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_notification', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('title', 'varchar(200)', col => col.notNull())
    .addColumn('message', 'text')

    .addColumn('type', sql`notification_type`, col => col.notNull())

    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('post_id', 'integer')

    .addColumn('read_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()
}

async function createNotificationPreferencesTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.notificationPreferences)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_notification_preference', ['id'])

    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('scope_type', sql`notification_preference_scope`, col => col.notNull())

    .addColumn('server_id', 'integer')
    .addColumn('channel_id', 'integer')

    .addColumn('is_subscribed', 'boolean', col => col.notNull().defaultTo(true))

    .addColumn('updated_at', 'timestamptz')

    .execute()

  await sql`ALTER TABLE notification_preferences 
  ADD CONSTRAINT uq_notification_preference 
  UNIQUE NULLS NOT DISTINCT (user_id, scope_type, server_id, channel_id)`.execute(db)
}

async function createRefreshTokensTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLENAMES.refreshTokens)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_refresh_token', ['id'])

    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('token_hash', 'varchar(255)', col => col.notNull())
    .addUniqueConstraint('uq_refresh_token_hash', ['token_hash'])

    .addColumn('expires_at', 'timestamptz', col => col.notNull())
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('revoked_at', 'timestamptz')

    .execute()
}