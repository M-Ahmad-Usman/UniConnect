/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { TABLE_NAMES } from '../types.js'

// This migration will create all tables with the following constraints:
// 1. PRIMARY KEY
// 2. UNIQUE
// 3. NOT NULL
// 4. CHECK

export async function up(db: Kysely<any>): Promise<void> {
  await createDepartmentsTable(db, TABLE_NAMES.departments)
  await createDisciplinesTable(db, TABLE_NAMES.disciplines)
  await createDegreeLevelsTable(db, TABLE_NAMES.degreeLevels)
  await createProgramsTable(db, TABLE_NAMES.programs)
  await createProgramCurriculaTable(db, TABLE_NAMES.programCurricula)
  await createUserTypesTable(db, TABLE_NAMES.userTypes)
  await createUsersTable(db, TABLE_NAMES.users)
  await createUserTypeAssignmentsTable(db, TABLE_NAMES.userTypeAssignments)
  await createStudentsTable(db, TABLE_NAMES.students)
  await createDesignationsTable(db, TABLE_NAMES.designations)
  await createTeachersTable(db, TABLE_NAMES.teachers)
  await createClassesTable(db, TABLE_NAMES.classes)
  await createSocietiesTable(db, TABLE_NAMES.societies)
  await createServerTypesTable(db, TABLE_NAMES.serverTypes)
  await createServersTable(db, TABLE_NAMES.servers)
  await createChannelTypesTable(db, TABLE_NAMES.channelTypes)
  await createChannelsTable(db, TABLE_NAMES.channels)
  await createServerMembershipsTable(db, TABLE_NAMES.serverMemberships)
  await createSocietyMembershipRequestsTable(db, TABLE_NAMES.societyMembershipRequests)
  await createCoursesTable(db, TABLE_NAMES.courses)
  await createCourseAssignmentsTable(db, TABLE_NAMES.courseAssignments)
  await createPostsTable(db, TABLE_NAMES.posts)
  await createPostAttachmentTypesTable(db, TABLE_NAMES.postAttachmentTypes)
  await createPostAttachmentsTable(db, TABLE_NAMES.postAttachments)
  await createUserRolesTable(db, TABLE_NAMES.userRoles)
  await createPermissionsTable(db, TABLE_NAMES.permissions)
  await createUserRolePermissionsTable(db, TABLE_NAMES.userRolePermissions)
  await createUserRoleAssignmentsTable(db, TABLE_NAMES.userRoleAssignments)
  await createNotificationTypesTable(db, TABLE_NAMES.notificationTypes)
  await createNotificationsTable(db, TABLE_NAMES.notifications)
  await createNotificationPreferencesTable(db, TABLE_NAMES.notificationPreferences)
  await createRefreshTokensTable(db, TABLE_NAMES.refreshTokens)
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

type TableCreationFunction = (db: Kysely<any>, tableName: string) => Promise<void>

const createDepartmentsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addUniqueConstraint(`uq_${tableName}_name`, ['name'])

    .addColumn('code', 'varchar(20)', col => col.notNull())
    .addUniqueConstraint(`uq_${tableName}_code`, ['code'])

    .addColumn('hod_id', 'integer')
    .addUniqueConstraint(`uq_${tableName}_hod_id`, ['hod_id'])

    .addColumn('server_id', 'integer', col => col.notNull())
    .addUniqueConstraint(`uq_${tableName}_server_id`, ['server_id'])

    .execute()
}

const createDisciplinesTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    // Use snake_case names for value
    .addCheckConstraint(`chk_${tableName}_snake_cased_value`, sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`)

    .execute()
}

const createDegreeLevelsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    // Use snake_case names for value
    .addCheckConstraint(`chk_${tableName}_snake_cased_value`, sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`)

    .execute()
}

const createProgramsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('department_id', 'integer', col => col.notNull())
    // data type must be same from 'disciplines'
    .addColumn('discipline', 'varchar(50)', col => col.notNull())
    // data type must be same from 'degree_levels'
    .addColumn('degree_level', 'varchar(50)', col => col.notNull())

    .addColumn('program_director_id', 'integer', col => col.notNull())

    .addColumn('semesters', 'integer', col => col.notNull())
    .addCheckConstraint(`chk_${tableName}_semester_positive`, sql<boolean>`semesters > 0`)

    .addColumn('code', 'varchar(20)', col => col.notNull())
    .addUniqueConstraint(`uq_${tableName}_code`, ['code'])

    .addUniqueConstraint(`uq_${tableName}`, ['discipline', 'degree_level', 'department_id'])

    .execute()
}

const createProgramCurriculaTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('program_id', 'integer', col => col.notNull())
    .addColumn('course_id', 'integer', col => col.notNull())
    .addColumn('semester_number', 'integer', col => col.notNull())
    .addColumn('batch_year', 'integer', col => col.notNull())

    .addUniqueConstraint(`uq_${tableName}`, ['program_id', 'batch_year', 'semester_number', 'course_id'])

    .execute()
}

const createUserTypesTable: TableCreationFunction = async (db, tableName) => {

  await db.schema
    .createTable(tableName)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(500)')

    .execute()

}

const createUsersTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('full_name', 'varchar(100)', col => col.notNull())

    .addColumn('personal_email', 'varchar(255)', col => col.notNull())
    .addUniqueConstraint(`uq_${tableName}_personal_email`, ['personal_email'])

    .addColumn('university_email', 'varchar(255)')

    .addColumn('phone', 'varchar(20)', col => col.notNull())
    .addColumn('password_hash', 'varchar(255)', col => col.notNull())

    .addColumn('gender', 'varchar(10)', col => col.notNull())
    .addCheckConstraint(`chk_${tableName}_gender`, sql<boolean>`gender IN ('male', 'female')`)

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
    .createIndex(`uidx_${tableName}_active_university_email`)
    .unique()
    .on(tableName)
    .column('university_email')
    .where(sql<boolean>`is_deleted = false`)
    .execute()
}

const createUserTypeAssignmentsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('user_id', 'integer')
    // data type must be same from 'user_types'
    .addColumn('type', 'varchar(50)')

    .addPrimaryKeyConstraint(`pk_${tableName}`, ['user_id', 'type'])
    .execute()

}

const createStudentsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('student_id', 'integer')
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['student_id'])

    .addColumn('class_id', 'integer', col => col.notNull())

    .addColumn('roll_number', 'integer', col => col.notNull())
    .addUniqueConstraint(`uq_${tableName}_roll_number`, ['roll_number'])

    .execute()
}

const createDesignationsTable: TableCreationFunction = async (db, tableName) => {

  await db.schema
    .createTable(tableName)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(500)')

    // Use snake_case names for value
    .addCheckConstraint(`chk_${tableName}_snake_cased_value`, sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`)

    .execute()

}

const createTeachersTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('teacher_id', 'integer')
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['teacher_id'])

    .addColumn('department_id', 'integer', col => col.notNull())

    // data type must be same from the 'designations'
    .addColumn('designation', 'varchar(50)', col => col.notNull())

    .execute()
}

const createClassesTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('program_id', 'integer', col => col.notNull())
    .addColumn('current_semester', 'integer', col => col.notNull())
    .addColumn('section', 'varchar(1)', col => col.notNull())
    .addCheckConstraint(`chk_${tableName}_section`, sql<boolean>`section IN ('A', 'B')`)

    .addColumn('cr_id', 'integer')
    .addUniqueConstraint(`uq_${tableName}_cr_id`, ['cr_id'])

    .addColumn('academic_year', 'integer', col => col.notNull())
    .addColumn('admission_year', 'integer', col => col.notNull())

    .addColumn('server_id', 'integer', col => col.notNull())
    .addUniqueConstraint(`uq_${tableName}_server_id`, ['server_id'])

    .addUniqueConstraint(`uq_${tableName}`, ['program_id', 'current_semester', 'section', 'admission_year'])
    .execute()
}

const createSocietiesTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('name', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(1000)')

    .addColumn('department_id', 'integer', col => col.notNull())
    .addColumn('president_id', 'integer', col => col.notNull())
    .addColumn('convenor_id', 'integer', col => col.notNull())

    .addColumn('server_id', 'integer', col => col.notNull())
    .addUniqueConstraint(`uq_${tableName}_server_id`, ['server_id'])

    .addColumn('is_deleted', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('deleted_by', 'integer')
    .addColumn('deleted_at', 'timestamptz')

    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()

  // Societies are soft deleteable entities.
  // Soft deleted socity names can be reused
  await db.schema
    .createIndex(`uidx_${tableName}_active_name`)
    .unique()
    .on(tableName)
    .column('name')
    .where(sql<boolean>`is_deleted = false`)
    .execute()
}

const createServerTypesTable: TableCreationFunction = async (db, tableName) => {

  await db.schema
    .createTable(tableName)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(500)')

    // Use snake_case names for value
    .addCheckConstraint(`chk_${tableName}_snake_cased_value`, sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`)

    .execute()

}

const createServersTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

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

const createChannelTypesTable: TableCreationFunction = async (db, tableName) => {

  await db.schema
    .createTable(tableName)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['value'])
    .addCheckConstraint(`chk_${tableName}_snake_cased_value`, sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`)

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(500)')

    .execute()
}

const createChannelsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addColumn('description', 'varchar(200)')

    // data type must be same from the 'channel_types'
    .addColumn('type', 'varchar(50)', col => col.notNull())

    .addColumn('server_id', 'integer', col => col.notNull())

    .addColumn('course_id', 'integer')

    .addColumn('program_id', 'integer')

    .addCheckConstraint(`chk_${tableName}_type_course_link_course_only`, sql<boolean>`(type != 'course') OR (course_id IS NOT NULL AND program_id IS NULL)`)
    .addCheckConstraint(`chk_${tableName}_type_program_link_program_only`, sql<boolean>`(type != 'program') OR (program_id IS NOT NULL AND course_id IS NULL)`)
    .addCheckConstraint(`chk_${tableName}_announcement_general_no_links`, sql<boolean>`(type NOT IN ('announcement', 'general')) OR (course_id IS NULL AND program_id IS NULL)`)

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
    .createIndex(`uidx_${tableName}_active_name_per_server`)
    .unique()
    .on(tableName)
    .columns(['server_id', 'name'])
    .where(sql<boolean>`is_deleted = false`)
    .execute()
}

const createServerMembershipsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('user_id', 'integer')

    .addColumn('server_id', 'integer')

    .addPrimaryKeyConstraint(`pk_${tableName}`, ['user_id', 'server_id'])

    .addColumn('joined_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('is_auto_joined', 'boolean', col => col.notNull().defaultTo(false))

    .execute()
}

const createSocietyMembershipRequestsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('society_id', 'integer', col => col.notNull())
    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('status', 'varchar(20)', col => col.notNull())
    .addCheckConstraint(`chk_${tableName}_status`, sql<boolean>`status IN ('pending', 'approved', 'rejected')`)

    .addColumn('requested_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('reviewed_by', 'integer')
    .addColumn('reviewed_at', 'timestamptz')

    .execute()


  // Allow users with rejected requests to apply again

  await db.schema
    .createIndex(`uidx_${tableName}_not_approved`)
    .unique()
    .on(tableName)
    .columns(['society_id', 'user_id'])
    .where(sql<boolean>`status IN ('pending', 'approved')`)
    .execute()
}

const createCoursesTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('title', 'varchar(100)', col => col.notNull())

    .addColumn('code', 'varchar(50)', col => col.notNull())
    .addUniqueConstraint(`uq_${tableName}_code`, ['code'])

    .addColumn('credit_hours', 'integer', col => col.notNull())
    .addCheckConstraint(`chk_${tableName}_credit_hours_positive`, sql<boolean>`credit_hours > 0`)

    .addColumn('department_id', 'integer', col => col.notNull())

    .execute()
}

const createCourseAssignmentsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('teacher_id', 'integer')
    .addColumn('course_id', 'integer')
    .addColumn('class_id', 'integer')

    .addPrimaryKeyConstraint(`pk_${tableName}`, ['class_id', 'course_id', 'teacher_id'])

    .execute()
}

const createPostsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('public_id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))

    .addColumn('title', 'varchar(100)', col => col.notNull())
    .addColumn('content', 'text', col => col.notNull())

    .addColumn('channel_id', 'integer', col => col.notNull())

    .addColumn('priority', 'varchar(50)', col => col.notNull().defaultTo(sql`'normal'`))
    .addCheckConstraint(`chk_${tableName}_priority`, sql<boolean>`priority IN ('normal', 'important', 'urgent')`)

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

const createPostAttachmentTypesTable: TableCreationFunction = async (db, tableName) => {

  await db.schema
    .createTable(tableName)

    .addColumn('value', 'varchar(150)', col => col.notNull())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['value'])

    .addColumn('max_size_bytes', 'integer', col => col.notNull())

    .execute()
}

const createPostAttachmentsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('post_id', 'integer', col => col.notNull())

    .addColumn('attachment_url', 'text', col => col.notNull())

    // Data type must be same from 'post_attachment_types'
    .addColumn('type', 'varchar(150)', col => col.notNull())

    .addColumn('uploaded_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))

    .execute()
}

const createUserRolesTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('value', 'varchar(50)', col => col.notNull())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['value'])

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .addColumn('description', 'varchar(500)')

    // Use snake_case names for value
    .addCheckConstraint(`chk_${tableName}_snake_cased_value`, sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`)

    .execute()
}

const createPermissionsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('action', 'text', col => col.notNull())
    .addColumn('resource', 'text', col => col.notNull())

    .addCheckConstraint(`chk_${tableName}_snake_cased_permission_names`, sql<boolean>`(action ~ '^[a-z]+(_[a-z]+)*$') AND (resource ~ '^[a-z]+(_[a-z]+)*$')`)

    .addUniqueConstraint(`uq_${tableName}`, ['action', 'resource'])

    .execute()
}

const createUserRolePermissionsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    // data type must be the same from 'roles'
    .addColumn('role', 'varchar(50)')
    .addColumn('permission_id', 'integer')

    .addPrimaryKeyConstraint(`pk_${tableName}`, ['role', 'permission_id'])

    .execute()
}

const createUserRoleAssignmentsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('user_id', 'integer', col => col.notNull())
    .addColumn('role', 'varchar(50)', col => col.notNull())

    .addColumn('server_id', 'integer')
    .addColumn('channel_id', 'integer')

    .addCheckConstraint(`chk_${tableName}_exactly_one_scope`, sql<boolean>`
       (server_id IS NOT NULL AND channel_id IS NULL) OR
       (server_id IS NULL AND channel_id IS NOT NULL)`)

    .addColumn('assigned_by', 'integer')
    .addColumn('assigned_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('expires_at', 'timestamptz')  // null = permanent

    .execute()

  // One role assignment per user per role per (server, channel) combination
  await sql`
    ALTER TABLE ${sql.ref(tableName)}
    ADD CONSTRAINT ${sql.raw(`uq_${tableName}`)}
    UNIQUE NULLS NOT DISTINCT (user_id, role, server_id, channel_id)
  `.execute(db)
}

const createNotificationTypesTable: TableCreationFunction = async (db, tableName) => {

  await db.schema
    .createTable(tableName)

    .addColumn('value', 'varchar(50)')
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['value'])

    .addCheckConstraint(`chk_${tableName}_snake_cased_value`, sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`)

    .addColumn('label', 'varchar(100)', col => col.notNull())

    .execute()

}

const createNotificationsTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

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

const createNotificationPreferencesTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('scope', 'varchar(20)', col => col.notNull())
    .addCheckConstraint(`chk_${tableName}_scope`, sql<boolean>`scope IN ('server', 'channel')`)

    .addColumn('server_id', 'integer')
    .addColumn('channel_id', 'integer')

    .addCheckConstraint(`chk_${tableName}_exactly_one_scope`, sql<boolean>`
     (scope = 'server' AND server_id IS NOT NULL AND channel_id IS NULL) OR
     (scope = 'channel' AND channel_id IS NOT NULL AND server_id IS NULL)`)

    .addColumn('is_subscribed', 'boolean', col => col.notNull().defaultTo(true))

    .addColumn('updated_at', 'timestamptz')

    .execute()

  await sql`ALTER TABLE ${sql.ref(tableName)}
  ADD CONSTRAINT ${sql.raw(`uq_${tableName}`)}
  UNIQUE NULLS NOT DISTINCT (user_id, server_id, channel_id, scope)`.execute(db)
}

const createRefreshTokensTable: TableCreationFunction = async (db, tableName) => {
  await db.schema
    .createTable(tableName)

    .addColumn('id', 'integer', col => col.generatedAlwaysAsIdentity())
    .addPrimaryKeyConstraint(`pk_${tableName}`, ['id'])

    .addColumn('user_id', 'integer', col => col.notNull())

    .addColumn('token_hash', 'varchar(255)', col => col.notNull())
    .addUniqueConstraint(`uq_${tableName}_token_hash`, ['token_hash'])

    .addColumn('expires_at', 'timestamptz', col => col.notNull())
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`NOW()`))
    .addCheckConstraint(`chk_${tableName}_expires_after_creation`, sql<boolean>`expires_at > created_at`)

    .addColumn('revoked_at', 'timestamptz')

    .execute()
}