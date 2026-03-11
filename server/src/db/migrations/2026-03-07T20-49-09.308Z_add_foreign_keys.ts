/* eslint-disable @typescript-eslint/no-explicit-any */

// This migration will define all foreign key constraints

import type { Kysely } from 'kysely'
import { TABLE_NAMES } from '../types.js'

export async function up(db: Kysely<any>): Promise<void> {

  for (const [camelCasedTableName, fkConstraints] of Object.entries(FK_CONSTRAINTS)) {

    const snakeCasedTableName = TABLE_NAMES[camelCasedTableName as keyof typeof TABLE_NAMES]

    for (const fkConstraint of Object.values(fkConstraints))
      await db.schema
        .alterTable(snakeCasedTableName)
        .addForeignKeyConstraint(
          fkConstraint.constraintName,
          [fkConstraint.columnName],
          fkConstraint.referencingTable,
          [fkConstraint.referencingColumn],
        )
        .onDelete(fkConstraint.onDelete)
        .execute()
  }
}

export async function down(db: Kysely<any>): Promise<void> {

  for (const [camelCasedTableName, fkConstraints] of Object.entries(FK_CONSTRAINTS).reverse()) {

    const snakeCasedTableName = TABLE_NAMES[camelCasedTableName as keyof typeof TABLE_NAMES]

    for (const fkConstraint of Object.values(fkConstraints))
      await db.schema
        .alterTable(snakeCasedTableName)
        .dropConstraint(fkConstraint.constraintName)
        .execute()
  }
}

interface FkConstraint {
  constraintName: string
  columnName: string
  referencingColumn: string
  referencingTable: string
  onDelete: 'restrict' | 'cascade' | 'set null' | 'set default' | 'no action'
}

type TableFkConstraints = Partial<Record<keyof typeof TABLE_NAMES, Record<string, FkConstraint>>>

// Single source of truth for everything related about foreign key constraints
const FK_CONSTRAINTS: TableFkConstraints = {
  departments: {
    hodId: {
      constraintName: 'fk_departments_hod_id',
      columnName: 'hod_id',
      referencingColumn: 'teacher_id',
      referencingTable: 'teachers',
      // Prevent teacher deletion if he is HOD.
      // New HOD must be assigned first.
      onDelete: 'restrict',
    },
    serverId: {
      constraintName: 'fk_departments_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Department owns its server not vice versa.
      onDelete: 'restrict',
    },
  },
  programs: {
    departmentId: {
      constraintName: 'fk_programs_department_id',
      columnName: 'department_id',
      referencingColumn: 'id',
      referencingTable: 'departments',
      // Prevent department deletion if it has programs.
      // Programs must be cleaned up first.
      onDelete: 'restrict',
    },
    programDirectorId: {
      constraintName: 'fk_programs_program_director_id',
      columnName: 'program_director_id',
      referencingColumn: 'teacher_id',
      referencingTable: 'teachers',
      // Prevent teacher deletion if teacher is a Program Director.
      // New director must be assigned first.
      onDelete: 'restrict',
    },
  },
  programCurricula: {
    programId: {
      constraintName: 'fk_program_curricula_program_id',
      columnName: 'program_id',
      referencingColumn: 'id',
      referencingTable: 'programs',
      // Delete curriculum record if program is being deleted
      onDelete: 'cascade',
    },
    courseId: {
      constraintName: 'fk_program_curricula_course_id',
      columnName: 'course_id',
      referencingColumn: 'id',
      referencingTable: 'courses',
      // Prevent course deletion if it is being taught in some program
      onDelete: 'restrict',
    },
  },
  users: {
    departmentId: {
      constraintName: 'fk_users_department_id',
      columnName: 'department_id',
      referencingColumn: 'id',
      referencingTable: 'departments',
      // Prevent department deletion if department has any user.
      // Users must be cleaned up or moved to another department first
      onDelete: 'restrict',
    },
    deletedBy: {
      constraintName: 'fk_users_deleted_by',
      columnName: 'deleted_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. User remains soft-deleted; only the actor identity is lost in case of hard delete.
      onDelete: 'set null',
    },
  },
  students: {
    studentId: {
      constraintName: 'fk_students_student_id',
      columnName: 'student_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Delete student if referencing user row is being deleted
      onDelete: 'cascade',
    },
    classId: {
      constraintName: 'fk_students_class_id',
      columnName: 'class_id',
      referencingColumn: 'id',
      referencingTable: 'classes',
      // Prevent class deletion if class has students.
      onDelete: 'restrict',
    },
  },
  teachers: {
    teacherId: {
      constraintName: 'fk_teachers_teacher_id',
      columnName: 'teacher_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Delete teacher if referencing user row is being deleted
      onDelete: 'cascade',
    },
  },
  classes: {
    programId: {
      constraintName: 'fk_classes_program_id',
      columnName: 'program_id',
      referencingColumn: 'id',
      referencingTable: 'programs',
      // Prevent program deletion if some class is enrolled in the program.
      onDelete: 'restrict',
    },
    crId: {
      constraintName: 'fk_classes_cr_id',
      columnName: 'cr_id',
      referencingColumn: 'student_id',
      referencingTable: 'students',
      // Prevent student deletion if student is cr.
      // New CR must be assigned first
      onDelete: 'restrict',
    },
    serverId: {
      constraintName: 'fk_classes_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Class owns its server not vice versa.
      onDelete: 'restrict',
    },
  },
  societies: {
    departmentId: {
      constraintName: 'fk_societies_department_id',
      columnName: 'department_id',
      referencingColumn: 'id',
      referencingTable: 'departments',
      // Prevent department deletion if department is managing some society.
      // Society must be moved to other department first.
      onDelete: 'restrict',
    },
    presidentId: {
      constraintName: 'fk_societies_president_id',
      columnName: 'president_id',
      referencingColumn: 'student_id',
      referencingTable: 'students',
      // Prevent student deletion if student is president of some society.
      // New president must be assigned first.
      onDelete: 'restrict',
    },
    convenorId: {
      constraintName: 'fk_societies_convenor_id',
      columnName: 'convenor_id',
      referencingColumn: 'teacher_id',
      referencingTable: 'teachers',
      // Prevent teacher deletion if teacher is convenor of some society.
      // New Society Convenor must be assigned first.
      onDelete: 'restrict',
    },
    serverId: {
      constraintName: 'fk_societies_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Society owns its server not vice versa.
      onDelete: 'restrict',
    },
  },
  servers: {
    createdBy: {
      constraintName: 'fk_servers_created_by',
      columnName: 'created_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. Server remains intact; only the creator identity is lost in case of hard delete.
      onDelete: 'set null',
    },
  },
  channels: {
    serverId: {
      constraintName: 'fk_channels_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Prevent server deletion if it has a channel.
      // Channel must be deleted first.
      onDelete: 'restrict',
    },
    courseId: {
      constraintName: 'fk_channels_course_id',
      columnName: 'course_id',
      referencingColumn: 'id',
      referencingTable: 'courses',
      // Prevent course deletion if that course is being taught to some class (class server has course channel)
      // Same rule as course_assignments.course_id ON DELETE RESTRICT
      onDelete: 'restrict',
    },
    programId: {
      constraintName: 'fk_channels_program_id',
      columnName: 'program_id',
      referencingColumn: 'id',
      referencingTable: 'programs',
      // Delete program channel if program is being deleted
      onDelete: 'cascade',
    },
    lockedBy: {
      constraintName: 'fk_channels_locked_by',
      columnName: 'locked_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. Channel remains locked; only the actor identity is lost in case of hard delete.
      onDelete: 'set null',
    },
    archivedBy: {
      constraintName: 'fk_channels_archived_by',
      columnName: 'archived_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. Channel remains archived; only the actor identity is lost in case of hard delete.
      onDelete: 'set null',
    },
    deletedBy: {
      constraintName: 'fk_channels_deleted_by',
      columnName: 'deleted_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. Channel remains soft-deleted; only the actor identity is lost in case of hard delete.
      onDelete: 'set null',
    },
    createdBy: {
      constraintName: 'fk_channels_created_by',
      columnName: 'created_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. Channel remains intact; only the creator identity is lost in case of hard delete.
      onDelete: 'set null',
    },
  },
  serverMemberships: {
    userId: {
      constraintName: 'fk_server_memberships_user_id',
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Clear membership record if user is being deleted.
      onDelete: 'cascade',
    },
    serverId: {
      constraintName: 'fk_server_memberships_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Clear membership record if server is being deleted.
      onDelete: 'cascade',
    },
  },
  societyMembershipRequests: {
    societyId: {
      constraintName: 'fk_society_membership_requests_society_id',
      columnName: 'society_id',
      referencingColumn: 'id',
      referencingTable: 'societies',
      // Clear record if society is being deleted.
      onDelete: 'cascade',
    },
    userId: {
      constraintName: 'fk_society_membership_requests_user_id',
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Clear record if user is being deleted.
      onDelete: 'cascade',
    },
    reviewedBy: {
      constraintName: 'fk_society_membership_requests_reviewed_by',
      columnName: 'reviewed_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. status remains intact; only the reviewer identity is lost in case of hard delete.
      onDelete: 'set null',
    },
  },
  courses: {
    departmentId: {
      constraintName: 'fk_courses_department_id',
      columnName: 'department_id',
      referencingColumn: 'id',
      referencingTable: 'departments',
      // Remove courses if department is being deleted.
      // This will remove only those courses which aren't taught to any class.
      /* If a class has enrolled a course then that course cannot be deleted due to:
        1. channels.course_id is set to 'restrict'
        2. course_assignments.course_id is set to 'restrict'
      */
      onDelete: 'cascade',
    },
  },
  courseAssignments: {
    teacherId: {
      constraintName: 'fk_course_assignments_teacher_id',
      columnName: 'teacher_id',
      referencingColumn: 'teacher_id',
      referencingTable: 'teachers',
      // Prevent teacher deletion if teacher is teaching some course.
      // Assign new teacher to the course and class first.
      onDelete: 'restrict',
    },
    courseId: {
      constraintName: 'fk_course_assignments_course_id',
      columnName: 'course_id',
      referencingColumn: 'id',
      referencingTable: 'courses',
      // Prevent course deletion if course is being taught to a class.
      onDelete: 'restrict',
    },
    classId: {
      constraintName: 'fk_course_assignments_class_id',
      columnName: 'class_id',
      referencingColumn: 'id',
      referencingTable: 'classes',
      // Prevent class deletion if a teacher is teaching some course to the class.
      onDelete: 'restrict',
    },
  },
  posts: {
    channelId: {
      constraintName: 'fk_posts_channel_id',
      columnName: 'channel_id',
      referencingColumn: 'id',
      referencingTable: 'channels',
      // Clear all posts if a channel is being deleted.
      /* Cascade chain:
        DELETE channel
          → CASCADE → posts deleted
            → CASCADE → notifications deleted (via notifications.post_id)
            → CASCADE → post_attachments deleted
      */
      onDelete: 'cascade',
    },
    pinnedBy: {
      constraintName: 'fk_posts_pinned_by',
      columnName: 'pinned_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. Post remains pinned; only the actor identity is lost in case of hard delete.
      onDelete: 'set null',
    },
    deletedBy: {
      constraintName: 'fk_posts_deleted_by',
      columnName: 'deleted_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. Post remains soft-deleted; only the actor identity is lost in case of hard delete.
      onDelete: 'set null',
    },
    createdBy: {
      constraintName: 'fk_posts_created_by',
      columnName: 'created_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Prevent user hard-deletion if user has created posts.
      // On soft-delete: post retains created_by since user row still exists. UI shows "Deactivated User".
      onDelete: 'restrict',
    },
    updatedBy: {
      constraintName: 'fk_posts_updated_by',
      columnName: 'updated_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. Post remains intact; only the last-editor identity is lost in case of hard delete.
      onDelete: 'set null',
    },
  },
  postAttachments: {
    postId: {
      constraintName: 'fk_post_attachments_post_id',
      columnName: 'post_id',
      referencingColumn: 'id',
      referencingTable: 'posts',
      // Clear post attachements if a post is being deleted.
      onDelete: 'cascade',
    },
  },
  rolePermissions: {
    roleId: {
      constraintName: 'fk_role_permissions_role_id',
      columnName: 'role_id',
      referencingColumn: 'id',
      referencingTable: 'roles',
      // Clear permissions for the role which is being deleted.
      onDelete: 'cascade',
    },
    permissionId: {
      constraintName: 'fk_role_permissions_permission_id',
      columnName: 'permission_id',
      referencingColumn: 'id',
      referencingTable: 'permissions',
      // Remove role permission if a permission is being deleted.
      onDelete: 'cascade',
    },
  },
  moderatorAssignments: {
    userId: {
      constraintName: 'fk_moderator_assignments_user_id',
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Clear role if a user is being deleted.
      onDelete: 'cascade',
    },
    serverId: {
      constraintName: 'fk_moderator_assignments_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Clear moderators if server is being deleted.
      onDelete: 'cascade',
    },
    channelId: {
      constraintName: 'fk_moderator_assignments_channel_id',
      columnName: 'channel_id',
      referencingColumn: 'id',
      referencingTable: 'channels',
      // Clear moderators if channel is being deleted.
      onDelete: 'cascade',
    },
    assignedBy: {
      constraintName: 'fk_moderator_assignments_assigned_by',
      columnName: 'assigned_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Nullable audit column. Assignment remains intact; only the assigner identity is lost in case of hard delete.
      onDelete: 'set null',
    },
  },
  notifications: {
    userId: {
      constraintName: 'fk_notifications_user_id',
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Clear notifications if a user is being deleted.
      onDelete: 'cascade',
    },
    postId: {
      constraintName: 'fk_notifications_post_id',
      columnName: 'post_id',
      referencingColumn: 'id',
      referencingTable: 'posts',
      // Clear notifications if a post is being deleted.
      onDelete: 'cascade',
    },
  },
  notificationPreferences: {
    userId: {
      constraintName: 'fk_notification_preferences_user_id',
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Clear preferences if a user is being deleted.
      onDelete: 'cascade',
    },
    serverId: {
      constraintName: 'fk_notification_preferences_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Clear preferences for the server which is being deleted.
      onDelete: 'cascade',
    },
    channelId: {
      constraintName: 'fk_notification_preferences_channel_id',
      columnName: 'channel_id',
      referencingColumn: 'id',
      referencingTable: 'channels',
      // Clear preferences for the channel which is being deleted.
      onDelete: 'cascade',
    },
  },
  refreshTokens: {
    userId: {
      constraintName: 'fk_refresh_tokens_user_id',
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Clear tokens for the user being deleted.
      onDelete: 'cascade',
    },
  },
} as const satisfies TableFkConstraints