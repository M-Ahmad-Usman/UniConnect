import type { TABLE_NAMES } from './2026-03-07T02-23-50.616Z_create_tables.js'
import type { Kysely } from 'kysely'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Define all foreign key constraints
 */
export async function up(db: Kysely<any>): Promise<void> {

  for (const foreignKeys of Object.values(FOREIGN_KEYS)) {
    for (const foreignKey of Object.values(foreignKeys)) {
      let query = db.schema
        .alterTable(foreignKey.localTable)
        .addForeignKeyConstraint(
          foreignKey.name,
          [foreignKey.localColumn],
          foreignKey.foreignTable,
          [foreignKey.foreignColumn],
        )
        .onDelete(foreignKey.onDelete)

      if (foreignKey.onUpdate)
        query = query.onUpdate(foreignKey.onUpdate)

      await query.execute()
    }
  }
}

export async function down(db: Kysely<any>): Promise<void> {

  for (const foreignKeys of Object.values(FOREIGN_KEYS).reverse()) {

    for (const foreignKey of Object.values(foreignKeys))
      await db.schema
        .alterTable(foreignKey.localTable)
        .dropConstraint(foreignKey.name)
        .ifExists()
        .execute()
  }
}

// Actual snake cased table names derived from TABLE_NAMES from create_tables migration
type tableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES]

interface FkConstraint {
  // name should follow the pattern: fk_<local_table>_<local_column>
  name: string
  localTable: tableName
  localColumn: string
  foreignColumn: string
  foreignTable: tableName
  onDelete: 'restrict' | 'cascade' | 'set null' | 'set default' | 'no action'
  onUpdate?: 'restrict' | 'cascade' | 'set null' | 'set default' | 'no action'
}

type TableFkConstraints = Partial<Record<keyof typeof TABLE_NAMES, Record<string, FkConstraint>>>

// Single source of truth for everything related about foreign key constraints
const FOREIGN_KEYS: TableFkConstraints = {
  departments: {
    hodId: {
      name: 'fk_departments_hod_id',
      localTable: 'departments',
      localColumn: 'hod_id',
      foreignColumn: 'teacher_id',
      foreignTable: 'teachers',
      // Prevent teacher deletion if he is HOD.
      // New HOD must be assigned first.
      // Rule is same for both soft and hard deletes
      onDelete: 'restrict',
    },
    serverId: {
      name: 'fk_departments_server_id',
      localTable: 'departments',
      localColumn: 'server_id',
      foreignColumn: 'id',
      foreignTable: 'servers',
      // Department owns its server not vice versa.
      // Server will be deleted alongside the hard deletion of department
      /* For hard deletion of server, first all channels associated with it must be hard deleted
          (hard deletion of channels would trigger its own cascade chain. See posts.channel_id)
      */
      onDelete: 'restrict',
    },
  },
  programs: {
    departmentId: {
      name: 'fk_programs_department_id',
      localTable: 'programs',
      localColumn: 'department_id',
      foreignColumn: 'id',
      foreignTable: 'departments',
      // Prevent hard delete of department if it has programs.
      // Programs must be cleaned up manually first.
      /* For hard deletion of program, the following manual hard clean up is required.
        DELETE program -> Remove classes enrolled in that program. Either HARD DELETE them or enroll them in some new program.
          DELETE classes -> DELETE students enrolled in that class.
            DELETE students -> re-assign student roles (society_president, cr) if any student has these.
      */
      onDelete: 'restrict',
    },
    discipline: {
      name: 'fk_programs_discipline',
      localTable: 'programs',
      localColumn: 'discipline',
      foreignColumn: 'value',
      foreignTable: 'disciplines',
      // Prevent hard deletion of discipline if it is already offered by department at some degree level
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
    programDirectorId: {
      name: 'fk_programs_program_director_id',
      localTable: 'programs',
      localColumn: 'program_director_id',
      foreignColumn: 'teacher_id',
      foreignTable: 'teachers',
      // Prevent teacher deletion if teacher is a Program Director.
      // New director must be assigned first.
      // Rule is same for both soft and hard deletes
      onDelete: 'restrict',
    },
  },
  programCurricula: {
    programId: {
      name: 'fk_program_curricula_program_id',
      localTable: 'program_curricula',
      localColumn: 'program_id',
      foreignColumn: 'id',
      foreignTable: 'programs',
      // Delete curriculum record if program is being deleted
      onDelete: 'cascade',
    },
    courseId: {
      name: 'fk_program_curricula_course_id',
      localTable: 'program_curricula',
      localColumn: 'course_id',
      foreignColumn: 'id',
      foreignTable: 'courses',
      // Prevent course deletion if it is being taught in some program
      onDelete: 'restrict',
    },
  },
  users: {
    deletedBy: {
      name: 'fk_users_deleted_by',
      localTable: 'users',
      localColumn: 'deleted_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. User remains soft-deleted; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  userTypeAssignments: {
    userId: {
      name: 'fk_user_type_assignments_user_id',
      localTable: 'user_type_assignments',
      localColumn: 'user_id',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Clear assignments if user is hard deleted
      // Hard Delete: CASCADE, Soft Delete: leave intact
      onDelete: 'cascade',
    },
    type: {
      name: 'fk_user_type_assignments_type',
      localTable: 'user_type_assignments',
      localColumn: 'type',
      foreignColumn: 'value',
      foreignTable: 'user_types',
      // Prevent hard deletion of user type if some user in the system has that type
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
  },
  students: {
    studentId: {
      name: 'fk_students_student_id',
      localTable: 'students',
      localColumn: 'student_id',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Delete student if referencing user row is being deleted
      // Hard Delete: CASCADE, Soft Delete: leave intact
      onDelete: 'cascade',
    },
    classId: {
      name: 'fk_students_class_id',
      localTable: 'students',
      localColumn: 'class_id',
      foreignColumn: 'id',
      foreignTable: 'classes',
      // Prevent class deletion if class has students.
      onDelete: 'restrict',
    },
  },
  teachers: {
    teacherId: {
      name: 'fk_teachers_teacher_id',
      localTable: 'teachers',
      localColumn: 'teacher_id',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Delete teacher if referencing user row is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact
      onDelete: 'cascade',
    },
    departmentId: {
      name: 'fk_teachers_department_id',
      localTable: 'teachers',
      localColumn: 'department_id',
      foreignColumn: 'id',
      foreignTable: 'departments',
      // Prevent hard deletion of department if it has any teacher.
      // Teachers must be cleaned up or moved to another department first
      onDelete: 'restrict',
    },
    designation: {
      name: 'fk_teachers_designation',
      localTable: 'teachers',
      localColumn: 'designation',
      foreignColumn: 'value',
      foreignTable: 'designations',
      // Restrct deletion of designation if some user has been assigned to it
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
  },
  classes: {
    programId: {
      name: 'fk_classes_program_id',
      localTable: 'classes',
      localColumn: 'program_id',
      foreignColumn: 'id',
      foreignTable: 'programs',
      // Prevent program deletion if some class is enrolled in the program.
      onDelete: 'restrict',
    },
    crId: {
      name: 'fk_classes_cr_id',
      localTable: 'classes',
      localColumn: 'cr_id',
      foreignColumn: 'student_id',
      foreignTable: 'students',
      // Prevent student deletion if student is cr.
      // New CR must be assigned first.
      // Rule is same for both soft and hard deletes.
      onDelete: 'restrict',
    },
    serverId: {
      name: 'fk_classes_server_id',
      localTable: 'classes',
      localColumn: 'server_id',
      foreignColumn: 'id',
      foreignTable: 'servers',
      // Class owns its server not vice versa.
      // Server will be deleted alongside the deletion of class
      /* For hard deletion of server, first all channels associated with it must be hard deleted
          (hard deletion of channels would trigger its own cascade chain. See posts.channel_id)
      */
      onDelete: 'restrict',
    },
  },
  societies: {
    departmentId: {
      name: 'fk_societies_department_id',
      localTable: 'societies',
      localColumn: 'department_id',
      foreignColumn: 'id',
      foreignTable: 'departments',
      // Prevent department deletion if department is managing some society.
      // Society must be moved to other department or deleted first.
      onDelete: 'restrict',
    },
    presidentId: {
      name: 'fk_societies_president_id',
      localTable: 'societies',
      localColumn: 'president_id',
      foreignColumn: 'student_id',
      foreignTable: 'students',
      // Prevent student deletion if student is president of some society.
      // New president must be assigned first.
      // Rule is same for both soft and hard deletes
      onDelete: 'restrict',
    },
    convenorId: {
      name: 'fk_societies_convenor_id',
      localTable: 'societies',
      localColumn: 'convenor_id',
      foreignColumn: 'teacher_id',
      foreignTable: 'teachers',
      // Prevent teacher deletion if teacher is convenor of some society.
      // New Society Convenor must be assigned first.
      onDelete: 'restrict',
    },
    deletedBy: {
      name: 'fk_societies_deleted_by',
      localTable: 'societies',
      localColumn: 'deleted_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Society remains soft-deleted; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    serverId: {
      name: 'fk_societies_server_id',
      localTable: 'societies',
      localColumn: 'server_id',
      foreignColumn: 'id',
      foreignTable: 'servers',
      // Society owns its server not vice versa.
      /* For hard deletion of server, first all channels associated with it must be hard deleted
          (hard deletion of channels would trigger its own cascade chain. See posts.channel_id)
      */
      onDelete: 'restrict',
    },
  },
  servers: {
    type: {
      name: 'fk_servers_type',
      localTable: 'servers',
      localColumn: 'type',
      foreignColumn: 'value',
      foreignTable: 'server_types',
      // Prevent hard deletion of server type if there is any server in the system with that type
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
    deletedBy: {
      name: 'fk_servers_deleted_by',
      localTable: 'servers',
      localColumn: 'deleted_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Server remains soft-deleted; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    createdBy: {
      name: 'fk_servers_created_by',
      localTable: 'servers',
      localColumn: 'created_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Server remains intact; only the creator identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  channels: {
    type: {
      name: 'fk_channels_type',
      localTable: 'channels',
      localColumn: 'type',
      foreignColumn: 'value',
      foreignTable: 'channel_types',
      // Prevent hard deletion of channel type if there is already any channel in the system with that type
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
    serverId: {
      name: 'fk_channels_server_id',
      localTable: 'channels',
      localColumn: 'server_id',
      foreignColumn: 'id',
      foreignTable: 'servers',
      // Prevent server deletion if it has a channel.
      /* Channel must be hard deleted first.
        hard deletion of channels would trigger its own cascade chain. See posts.channel_id
      */
      onDelete: 'restrict',
    },
    courseId: {
      name: 'fk_channels_course_id',
      localTable: 'channels',
      localColumn: 'course_id',
      foreignColumn: 'id',
      foreignTable: 'courses',
      // Prevent course deletion if that course is being taught to some class (class server has course channel)
      onDelete: 'restrict',
    },
    programId: {
      name: 'fk_channels_program_id',
      localTable: 'channels',
      localColumn: 'program_id',
      foreignColumn: 'id',
      foreignTable: 'programs',
      // Delete program channel if program is being deleted
      onDelete: 'cascade',
    },
    lockedBy: {
      name: 'fk_channels_locked_by',
      localTable: 'channels',
      localColumn: 'locked_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Channel remains locked; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    archivedBy: {
      name: 'fk_channels_archived_by',
      localTable: 'channels',
      localColumn: 'archived_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Channel remains archived; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    deletedBy: {
      name: 'fk_channels_deleted_by',
      localTable: 'channels',
      localColumn: 'deleted_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Channel remains soft-deleted; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    createdBy: {
      name: 'fk_channels_created_by',
      localTable: 'channels',
      localColumn: 'created_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Channel remains intact; only the creator identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  serverMemberships: {
    userId: {
      name: 'fk_server_memberships_user_id',
      localTable: 'server_memberships',
      localColumn: 'user_id',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Clear membership record if user is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    serverId: {
      name: 'fk_server_memberships_server_id',
      localTable: 'server_memberships',
      localColumn: 'server_id',
      foreignColumn: 'id',
      foreignTable: 'servers',
      // Clear membership record if server is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
  },
  societyMembershipRequests: {
    societyId: {
      name: 'fk_society_membership_requests_society_id',
      localTable: 'society_membership_requests',
      localColumn: 'society_id',
      foreignColumn: 'id',
      foreignTable: 'societies',
      // Clear record if society is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    userId: {
      name: 'fk_society_membership_requests_user_id',
      localTable: 'society_membership_requests',
      localColumn: 'user_id',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Clear record if user is being deleted.
      // Hard Delete: CASCADE, Soft DELETE: delete pending requests only
      onDelete: 'cascade',
    },
    reviewedBy: {
      name: 'fk_society_membership_requests_reviewed_by',
      localTable: 'society_membership_requests',
      localColumn: 'reviewed_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. status remains intact; only the reviewer identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  courses: {
    departmentId: {
      name: 'fk_courses_department_id',
      localTable: 'courses',
      localColumn: 'department_id',
      foreignColumn: 'id',
      foreignTable: 'departments',
      // Remove courses if department is being deleted.
      // This will remove only those courses which aren't taught to any class.
      /* If a class has enrolled a course then that course cannot be deleted due to:
        1. channels.course_id is set to 'restrict'
        2. course_assignments.course_id is set to 'restrict'
      */
      /* For hard deletion of courses being taught to some class, the following manual cleanup would be required:
        - Remove course assignment of that course from the course_assignments
        - Delete course channels of that from the class servers
      */
      onDelete: 'cascade',
    },
  },
  courseAssignments: {
    teacherId: {
      name: 'fk_course_assignments_teacher_id',
      localTable: 'course_assignments',
      localColumn: 'teacher_id',
      foreignColumn: 'teacher_id',
      foreignTable: 'teachers',
      // Prevent teacher deletion if teacher is teaching some course.
      // Assign new teacher to the course and class first.
      // Same rule for both soft and hard deletions
      onDelete: 'restrict',
    },
    courseId: {
      name: 'fk_course_assignments_course_id',
      localTable: 'course_assignments',
      localColumn: 'course_id',
      foreignColumn: 'id',
      foreignTable: 'courses',
      // Prevent course deletion if course is being taught to a class.
      // First un assign the course
      onDelete: 'restrict',
    },
    classId: {
      name: 'fk_course_assignments_class_id',
      localTable: 'course_assignments',
      localColumn: 'class_id',
      foreignColumn: 'id',
      foreignTable: 'classes',
      // Prevent class deletion if a teacher is teaching some course to the class.
      // First remove the course_assignment
      onDelete: 'restrict',
    },
  },
  posts: {
    channelId: {
      name: 'fk_posts_channel_id',
      localTable: 'posts',
      localColumn: 'channel_id',
      foreignColumn: 'id',
      foreignTable: 'channels',
      // Clear all posts if a channel is being deleted.
      // Hard delete: CASCADE, Soft delete: leave intact
      /* The following cascade chain will be executed automatically on hard delete
        DELETE channel -> posts deleted
          posts deleted -> notifications deleted
          posts deleted -> post_attachements deleted
      */
      onDelete: 'cascade',
    },
    pinnedBy: {
      name: 'fk_posts_pinned_by',
      localTable: 'posts',
      localColumn: 'pinned_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Post remains pinned; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    deletedBy: {
      name: 'fk_posts_deleted_by',
      localTable: 'posts',
      localColumn: 'deleted_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Post remains soft-deleted; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    createdBy: {
      name: 'fk_posts_created_by',
      localTable: 'posts',
      localColumn: 'created_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Prevent user hard-deletion if user has created posts.
      // Hard Delete: RESTRICT, Soft Delete: leave intact.
      onDelete: 'restrict',
    },
    editedBy: {
      name: 'fk_posts_edited_by',
      localTable: 'posts',
      localColumn: 'edited_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Post remains intact; only the last-editor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  postAttachments: {
    postId: {
      name: 'fk_post_attachments_post_id',
      localTable: 'post_attachments',
      localColumn: 'post_id',
      foreignColumn: 'id',
      foreignTable: 'posts',
      // Clear post attachements if a post is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    type: {
      name: 'fk_post_attachments_type',
      localTable: 'post_attachments',
      localColumn: 'type',
      foreignColumn: 'value',
      foreignTable: 'post_attachment_types',
      // Prevent hard deletion of attachment type if its already used
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
  },
  userRolePermissions: {
    role: {
      name: 'fk_user_role_permissions_role',
      localTable: 'user_role_permissions',
      localColumn: 'role',
      foreignColumn: 'value',
      foreignTable: 'user_roles',
      // Clear permissions for the role which is being deleted.
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    permissionId: {
      name: 'fk_user_role_permissions_permission_id',
      localTable: 'user_role_permissions',
      localColumn: 'permission_id',
      foreignColumn: 'id',
      foreignTable: 'permissions',
      // Remove role permission if a permission is being deleted.
      onDelete: 'cascade',
    },
  },
  userRoleAssignments: {
    userId: {
      name: 'fk_user_role_assignments_user_id',
      localTable: 'user_role_assignments',
      localColumn: 'user_id',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Clear assignment if a user is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    role: {
      name: 'fk_user_role_assignments_role',
      localTable: 'user_role_assignments',
      localColumn: 'role',
      foreignColumn: 'value',
      foreignTable: 'user_roles',
      // Clear assignment if role is being deleted
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    serverId: {
      name: 'fk_user_role_assignments_server_id',
      localTable: 'user_role_assignments',
      localColumn: 'server_id',
      foreignColumn: 'id',
      foreignTable: 'servers',
      // Clear assignments for server if server is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    channelId: {
      name: 'fk_user_role_assignments_channel_id',
      localTable: 'user_role_assignments',
      localColumn: 'channel_id',
      foreignColumn: 'id',
      foreignTable: 'channels',
      // Clear assignment for channel if channel is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    assignedBy: {
      name: 'fk_user_role_assignments_assigned_by',
      localTable: 'user_role_assignments',
      localColumn: 'assigned_by',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Nullable audit column. Assignment remains intact; only the assigner identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  notifications: {
    type: {
      name: 'fk_notifications_type',
      localTable: 'notifications',
      localColumn: 'type',
      foreignColumn: 'value',
      foreignTable: 'notification_types',
      // Remove all notifications if notification type is being deleted
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    userId: {
      name: 'fk_notifications_user_id',
      localTable: 'notifications',
      localColumn: 'user_id',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Clear notifications if a user is being deleted.
      // CASCADE both soft and hard deletions
      onDelete: 'cascade',
    },
    postId: {
      name: 'fk_notifications_post_id',
      localTable: 'notifications',
      localColumn: 'post_id',
      foreignColumn: 'id',
      foreignTable: 'posts',
      // Clear notifications if a post is being deleted.
      // CASCADE for both soft and hard deletions
      onDelete: 'cascade',
    },
  },
  notificationPreferences: {
    userId: {
      name: 'fk_notification_preferences_user_id',
      localTable: 'notification_preferences',
      localColumn: 'user_id',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Clear preferences if a user is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    serverId: {
      name: 'fk_notification_preferences_server_id',
      localTable: 'notification_preferences',
      localColumn: 'server_id',
      foreignColumn: 'id',
      foreignTable: 'servers',
      // Clear preferences for the server which is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    channelId: {
      name: 'fk_notification_preferences_channel_id',
      localTable: 'notification_preferences',
      localColumn: 'channel_id',
      foreignColumn: 'id',
      foreignTable: 'channels',
      // Clear preferences for the channel which is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
  },
  refreshTokens: {
    userId: {
      name: 'fk_refresh_tokens_user_id',
      localTable: 'refresh_tokens',
      localColumn: 'user_id',
      foreignColumn: 'id',
      foreignTable: 'users',
      // Clear tokens for the user being deleted.
      // CASCADE for both soft and hard deletions
      onDelete: 'cascade',
    },
  },
} as const satisfies TableFkConstraints