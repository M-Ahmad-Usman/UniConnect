/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { TABLE_NAMES } from '../types.js'

// This migration will create all tables with the following constraints:
// 1. PRIMARY KEY
// 2. UNIQUE
// 3. NOT NULL

export async function up(db: Kysely<any>): Promise<void> {
  await createDepartmentsTable(db)
  await createDisciplinesTable(db)
  await createDegreeLevelsTable(db)
  await createProgramsTable(db)
  await createProgramCurriculaTable(db)
  await createUserTypesTable(db)
  await createUsersTable(db)
  await createUserTypeAssignmentsTable(db)
  await createStudentsTable(db)
  await createDesignationsTable(db)
  await createTeachersTable(db)
  await createClassesTable(db)
  await createSocietiesTable(db)
  await createServerTypesTable(db)
  await createServersTable(db)
  await createChannelTypesTable(db)
  await createChannelsTable(db)
  await createServerMembershipsTable(db)
  await createSocietyMembershipRequestsTable(db)
  await createCoursesTable(db)
  await createCourseAssignmentsTable(db)
  await createPostsTable(db)
  await createFileAttachmentTypesTable(db)
  await createPostAttachmentsTable(db)
  await createRolesTable(db)
  await createPermissionsTable(db)
  await createRolePermissionsTable(db)
  await createRoleAssignmentsTable(db)
  await createNotificationTypesTable(db)
  await createNotificationsTable(db)
  await createNotificationPreferencesTable(db)
  await createRefreshTokensTable(db)
}

export async function down(db: Kysely<any>): Promise<void> {

  // Since foreign keys are in separate migration so dropping order of tables doesn't matter
  for (const tableName of Object.values(TABLE_NAMES))
    await db.schema
      .dropTable(tableName)
      .ifExists()
      .execute()
}

// Dedicated Table Creation Functions

async function createDepartmentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.departments)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_departments', ['id'])

    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addUniqueConstraint('uq_departments_name', ['name'])

    .addColumn('code', 'varchar(20)', col => col.notNull())
    .addUniqueConstraint('uq_departments_code', ['code'])

    .addColumn('hod_id', 'integer')
    .addUniqueConstraint('uq_departments_hod_id', ['hod_id'])

    .addColumn('server_id', 'integer', col => col.notNull())
    .addUniqueConstraint('uq_departments_server_id', ['server_id'])

    .execute()
}

async function createDisciplinesTable(db: Kysely<any>): Promise<void> {

  await db.schema
    .createTable(TABLE_NAMES.disciplines)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint('pk_disciplines', ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .execute()

}

async function createDegreeLevelsTable(db: Kysely<any>): Promise<void> {

  await db.schema
    .createTable(TABLE_NAMES.degreeLevels)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint('pk_degree_levels', ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .execute()

}

async function createProgramsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.programs)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_programs', ['id'])

    .addColumn('department_id', 'integer', col => col.notNull())
    // data type must be same from 'disciplines'
    .addColumn('discipline', 'varchar(50)', col => col.notNull())
    // data type must be same from 'degree_levels'
    .addColumn('degree_level', 'varchar(50)', col => col.notNull())

    .addColumn('program_director_id', 'integer', col => col.notNull())

    .addColumn('semesters', 'integer', col => col.notNull())

    .addColumn('code', 'varchar(20)', col => col.notNull())
    .addUniqueConstraint('uq_programs_code', ['code'])

    .addUniqueConstraint('uq_programs', ['discipline', 'degree_level', 'department_id'])

    .execute()
}

async function createProgramCurriculaTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.programCurricula)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_program_curricula', ['id'])

    .addColumn('program_id', 'integer', col => col.notNull())
    .addColumn('course_id', 'integer', col => col.notNull())
    .addColumn('semester_number', 'integer', col => col.notNull())
    .addColumn('batch_year', 'integer', col => col.notNull())

    .addUniqueConstraint('uq_program_curriculum', ['program_id', 'batch_year', 'semester_number', 'course_id'])

    .execute()
}

async function createUserTypesTable(db: Kysely<any>): Promise<void> {

  await db.schema
    .createTable(TABLE_NAMES.userTypes)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint('pk_user_types', ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(500)')

    .execute()

}

async function createUsersTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.users)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_users', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('full_name', 'varchar(100)', col => col.notNull())

    .addColumn('personal_email', 'varchar(255)', col => col.notNull())
    .addUniqueConstraint('uq_users_personal_email', ['personal_email'])

    .addColumn('university_email', 'varchar(255)')

    .addColumn('phone', 'varchar(20)', col => col.notNull())
    .addColumn('password_hash', 'varchar(255)', col => col.notNull())

    .addColumn('gender', sql`gender`, col => col.notNull())
    .addColumn('profile_picture_url', 'text')
    .addColumn('bio', 'varchar(1000)')

    .addColumn('is_deleted', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('deleted_by', 'integer')
    .addColumn('deleted_at', 'timestamptz')

    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz')

    .execute()

  // Allow reuse of university email for soft-deleted users
  await db.schema
    .createIndex('uidx_users_active_university_email')
    .unique()
    .on(TABLE_NAMES.users)
    .column('university_email')
    .where(sql<boolean>`is_deleted = false`)
    .execute()
}

async function createUserTypeAssignmentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.userTypeAssignments)

    .addColumn('user_id', 'integer')
    // data type must be same from 'user_types'
    .addColumn('type', 'varchar(50)')

    .addPrimaryKeyConstraint('pk_user_type_assignments', ['user_id', 'type'])
    .execute()

}

async function createStudentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.students)

    .addColumn('student_id', 'integer')
    .addPrimaryKeyConstraint('pk_students', ['student_id'])

    .addColumn('class_id', 'integer', col => col.notNull())

    .addColumn('roll_number', 'integer', col => col.notNull())
    .addUniqueConstraint('uq_students_roll_number', ['roll_number'])

    .execute()
}

async function createDesignationsTable(db: Kysely<any>): Promise<void> {

  await db.schema
    .createTable(TABLE_NAMES.designations)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint('pk_designations', ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(500)')

    .execute()

}

async function createTeachersTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.teachers)

    .addColumn('teacher_id', 'integer')
    .addPrimaryKeyConstraint('pk_teachers', ['teacher_id'])

    .addColumn('department_id', 'integer', col => col.notNull())

    // data type must be same from the 'designations'
    .addColumn('designation', 'varchar(50)', col => col.notNull())

    .execute()
}

async function createClassesTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.classes)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_classes', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('program_id', 'integer', col => col.notNull())
    .addColumn('current_semester', 'integer', col => col.notNull())
    .addColumn('section', sql`class_section`, col => col.notNull())

    .addColumn('cr_id', 'integer')
    .addUniqueConstraint('uq_classes_cr_id', ['cr_id'])

    .addColumn('academic_year', 'integer', col => col.notNull())
    .addColumn('admission_year', 'integer', col => col.notNull())

    .addColumn('server_id', 'integer', col => col.notNull())
    .addUniqueConstraint('uq_classes_server_id', ['server_id'])

    .addUniqueConstraint('uq_classes', ['program_id', 'current_semester', 'section', 'admission_year'])
    .execute()
}

async function createSocietiesTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.societies)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_societies', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('name', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(1000)')

    .addColumn('department_id', 'integer', col => col.notNull())
    .addColumn('president_id', 'integer', col => col.notNull())
    .addColumn('convenor_id', 'integer', col => col.notNull())

    .addColumn('server_id', 'integer', col => col.notNull())
    .addUniqueConstraint('uq_societies_server_id', ['server_id'])

    .addColumn('is_deleted', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('deleted_by', 'integer')
    .addColumn('deleted_at', 'timestamptz')

    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()

  // Societies are soft deleteable entities.
  // Soft deleted socity names can be reused
  await db.schema
    .createIndex('uidx_active_society_name')
    .unique()
    .on(TABLE_NAMES.societies)
    .column('name')
    .where(sql<boolean>`is_deleted = false`)
    .execute()
}

async function createServerTypesTable(db: Kysely<any>): Promise<void> {

  await db.schema
    .createTable(TABLE_NAMES.serverTypes)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint('pk_server_types', ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(500)')

    .execute()

}

async function createServersTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.servers)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_servers', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addColumn('description', 'text')
    .addColumn('icon_url', 'text')

    // data type must be same from 'server_types'
    .addColumn('type', 'varchar(50)', col => col.notNull())

    .addColumn('is_deleted', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('deleted_by', 'integer')
    .addColumn('deleted_at', 'timestamptz')

    .addColumn('created_by', 'integer')
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()
}

async function createChannelTypesTable(db: Kysely<any>): Promise<void> {

  await db.schema
    .createTable(TABLE_NAMES.channelTypes)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint('pk_channel_types', ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(500)')

    .execute()

}

async function createChannelsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.channels)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_channels', ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addColumn('description', 'varchar(200)')

    // data type must be same from the 'channel_types'
    .addColumn('type', 'varchar(50)', col => col.notNull())

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

    .execute()

  // Channels are soft-deletable entities.
  // Deleted channel names can be reused.
  await db.schema
    .createIndex('uidx_active_channel_name_per_server')
    .unique()
    .on(TABLE_NAMES.channels)
    .columns(['server_id', 'name'])
    .where(sql<boolean>`is_deleted = false`)
    .execute()
}

async function createServerMembershipsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.serverMemberships)

    .addColumn('user_id', 'integer')

    .addColumn('server_id', 'integer')

    .addPrimaryKeyConstraint('pk_server_memberships', ['user_id', 'server_id'])

    .addColumn('joined_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('is_auto_joined', 'boolean', col => col.notNull().defaultTo(false))

    .execute()
}

async function createSocietyMembershipRequestsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.societyMembershipRequests)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_society_membership_requests', ['id'])

    .addColumn('society_id', 'integer', col => col.notNull())
    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('status', sql`membership_request_status`, col => col.notNull())

    .addColumn('requested_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('reviewed_by', 'integer')
    .addColumn('reviewed_at', 'timestamptz')

    .execute()


  // Allow users with rejected requests to apply again

  await db.schema
    .createIndex('uidx_society_membership_requests_not_approved')
    .unique()
    .on(TABLE_NAMES.societyMembershipRequests)
    .columns(['society_id', 'user_id'])
    .where(sql<boolean>`status IN ('pending', 'approved')`)
    .execute()
}

async function createCoursesTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.courses)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_courses', ['id'])

    .addColumn('title', 'varchar(100)', col => col.notNull())

    .addColumn('code', 'varchar(50)', col => col.notNull())
    .addUniqueConstraint('uq_courses_code', ['code'])

    .addColumn('credit_hours', 'integer', col => col.notNull())

    .addColumn('department_id', 'integer', col => col.notNull())

    .execute()
}

async function createCourseAssignmentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.courseAssignments)

    .addColumn('teacher_id', 'integer')
    .addColumn('course_id', 'integer')
    .addColumn('class_id', 'integer')

    .addPrimaryKeyConstraint('pk_course_assignments', ['class_id', 'course_id', 'teacher_id'])

    .execute()
}

async function createPostsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.posts)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_posts', ['id'])

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

async function createFileAttachmentTypesTable(db: Kysely<any>): Promise<void> {

  await db.schema
    .createTable(TABLE_NAMES.fileAttachmentTypes)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_file_attachment_types', ['id'])

    .addColumn('type', 'varchar(150)', col => col.notNull())
    .addUniqueConstraint('uq_file_attachment_types_type', ['type'])

    .addColumn('max_size_bytes', 'integer', col => col.notNull())

    .execute()

}

async function createPostAttachmentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.postAttachments)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_post_attachments', ['id'])

    .addColumn('post_id', 'integer', col => col.notNull())

    .addColumn('file_url', 'text', col => col.notNull())

    .addColumn('attachment_type_id', 'integer', col => col.notNull())

    .addColumn('uploaded_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()
}

async function createRolesTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.roles)

    .addColumn('value', 'varchar(50)', col => col.notNull())
    .addPrimaryKeyConstraint('pk_roles', ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(500)')

    .execute()
}

async function createPermissionsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.permissions)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_permissions', ['id'])

    .addColumn('action', 'text', col => col.notNull())
    .addColumn('resource', 'text', col => col.notNull())

    .addUniqueConstraint('uq_permissions', ['action', 'resource'])

    .execute()
}

async function createRolePermissionsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.rolePermissions)

    // data type must be the same from 'roles'
    .addColumn('role', 'varchar(50)')
    .addColumn('permission_id', 'integer')

    .addPrimaryKeyConstraint('pk_role_permissions', ['role', 'permission_id'])

    .execute()
}

async function createRoleAssignmentsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.roleAssignments)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_role_assignments', ['id'])

    .addColumn('user_id', 'integer', col => col.notNull())
    .addColumn('role', 'varchar(50)', col => col.notNull())

    .addColumn('server_id', 'integer')
    .addColumn('channel_id', 'integer')

    .addColumn('assigned_by', 'integer')
    .addColumn('assigned_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('expires_at', 'timestamptz')  // null = permanent

    .execute()

  // One role assignment per user per role per (server, channel) combination
  await sql`
    ALTER TABLE role_assignments
    ADD CONSTRAINT uq_role_assignments
    UNIQUE NULLS NOT DISTINCT (user_id, role, server_id, channel_id)
  `.execute(db)
}

async function createNotificationTypesTable(db: Kysely<any>): Promise<void> {

  await db.schema
    .createTable(TABLE_NAMES.notificationTypes)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint('pk_notification_types', ['value'])

    .execute()

}

async function createNotificationsTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.notifications)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_notifications', ['id'])

    .addColumn('title', 'varchar(200)', col => col.notNull())
    .addColumn('message', 'text')

    // data type must be same from 'notification_types'
    .addColumn('type', 'varchar(50)', col => col.notNull())

    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('post_id', 'integer')

    .addColumn('read_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()
}

async function createNotificationPreferencesTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.notificationPreferences)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_notification_preferences', ['id'])

    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('scope_type', sql`notification_preference_scope`, col => col.notNull())

    .addColumn('server_id', 'integer')
    .addColumn('channel_id', 'integer')

    .addColumn('is_subscribed', 'boolean', col => col.notNull().defaultTo(true))

    .addColumn('updated_at', 'timestamptz')

    .execute()

  await sql`ALTER TABLE notification_preferences 
  ADD CONSTRAINT uq_notification_preferences
  UNIQUE NULLS NOT DISTINCT (user_id, server_id, channel_id, scope_type)`.execute(db)
}

async function createRefreshTokensTable(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAMES.refreshTokens)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint('pk_refresh_tokens', ['id'])

    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('token_hash', 'varchar(255)', col => col.notNull())
    .addUniqueConstraint('uq_refresh_tokens_token_hash', ['token_hash'])

    .addColumn('expires_at', 'timestamptz', col => col.notNull())
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('revoked_at', 'timestamptz')

    .execute()
}