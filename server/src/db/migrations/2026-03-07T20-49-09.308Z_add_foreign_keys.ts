/* eslint-disable @typescript-eslint/no-explicit-any */

// This migration will define all foreign key constraints

import type { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {

}

export async function down(db: Kysely<any>): Promise<void> {

}

interface FkConstraint {
  constraintName: string
  columnName: string
  referencingColumn: string
  referencingTable: string
  onDelete: 'restrict' | 'cascade' | 'set null' | 'set default' | 'no action'
}

type TableFkConstraints = Record<string, Record<string, FkConstraint>>

// Single source of truth for everything related about foreign key constraints
const FK_CONSTRAINTS: TableFkConstraints = {
  departments: {
    hodId: {
      constraintName: 'fk_departments_hod_id',
      columnName: 'hod_id',
      referencingColumn: 'teacher_id',
      referencingTable: 'teachers',
      // Prevent teacher deletion if he is HOD. New HOD must be assigned first.
      onDelete: 'restrict',
    },
    serverId: {
      constraintName: 'fk_departments_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Department owns its server. Department will delete the server.
      onDelete: 'restrict',
    },
  },
  programs: {
    departmentId: {
      constraintName: 'fk_programs_department_id',
      columnName: 'department_id',
      referencingColumn: 'id',
      referencingTable: 'departments',
      // Prevent department deletion if it has programs. Programs must be cleaned up first.
      onDelete: 'restrict',
    },
    programDirectorId: {
      constraintName: 'fk_programs_program_director_id',
      columnName: 'program_director_id',
      referencingColumn: 'teacher_id',
      referencingTable: 'teachers',
      // Prevent teacher deletion if teacher is a Program Director. New director must be assigned first.
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
      // Prevent department deletion if department has any user. Users must be cleaned up first
      onDelete: 'restrict',
    },
  },
  students: {
    studentId: {
      constraintName: 'fk_students_student_id',
      columnName: 'student_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Delete student if user is being deleted
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
      // Delete teacher if user is being deleted
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
      // Prevent student deletion if student is cr. New CR must be assigned first
      onDelete: 'restrict',
    },
    serverId: {
      constraintName: 'fk_classes_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Class owns its server. Class will delete the server.
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
      onDelete: 'restrict',
    },
    presidentId: {
      constraintName: 'fk_societies_president_id',
      columnName: 'president_id',
      referencingColumn: 'student_id',
      referencingTable: 'students',
      // Prevent student deletion if student is president of some society.
      onDelete: 'restrict',
    },
    convenorId: {
      constraintName: 'fk_societies_convenor_id',
      columnName: 'convenor_id',
      referencingColumn: 'teacher_id',
      referencingTable: 'teachers',
      // Prevent teacher deletion if teacher is convenor of some society.
      onDelete: 'restrict',
    },
    serverId: {
      constraintName: 'fk_societies_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Society owns its server. Server will be deleted alongside the society.
      onDelete: 'restrict',
    },
  },
  servers: {
    createdBy: {
      constraintName: 'fk_servers_created_by',
      columnName: 'created_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // need more consideration
      // Prevent user deletion if user has created some server
      onDelete: 'restrict',
    },
  },
  channels: {
    serverId: {
      constraintName: 'fk_channels_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Prevent server deletion if it has a channel. Channel must be deleted first.
      onDelete: 'restrict',
    },
    courseId: {
      constraintName: 'fk_channels_course_id',
      columnName: 'course_id',
      referencingColumn: 'id',
      referencingTable: 'courses',
      // Prevent course deletion if some server has a course channel for that course
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
      // Need more consideration
      onDelete: 'set null',
    },
    archivedBy: {
      constraintName: 'fk_channels_archived_by',
      columnName: 'archived_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Need more consideration
      onDelete: 'set null',
    },
    deletedBy: {
      constraintName: 'fk_channels_deleted_by',
      columnName: 'deleted_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Need more consideration
      onDelete: 'set null',
    },
    createdBy: {
      constraintName: 'fk_channels_created_by',
      columnName: 'created_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Need more consideration
      onDelete: 'set null',
    },
  },
  serverMemberships: {
    userId: {
      constraintName: 'fk_server_memberships_user_id',
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Clear membership record if user is being deleted
      onDelete: 'cascade',
    },
    serverId: {
      constraintName: 'fk_server_memberships_server_id',
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: 'servers',
      // Clear membership record if server is being deleted
      onDelete: 'cascade',
    },
  },
  societyMembershipRequests: {
    societyId: {
      constraintName: 'fk_society_membership_requests_society_id',
      columnName: 'society_id',
      referencingColumn: 'id',
      referencingTable: 'societies',
      // Clear record if society is being deleted
      onDelete: 'cascade',
    },
    userId: {
      constraintName: 'fk_society_membership_requests_user_id',
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Clear record if user is being deleted
      onDelete: 'cascade',
    },
    reviewedBy: {
      constraintName: 'fk_society_membership_requests_reviewed_by',
      columnName: 'reviewed_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Seems good
      onDelete: 'set null',
    },
  },
  courses: {
    departmentId: {
      constraintName: 'fk_courses_department_id',
      columnName: 'department_id',
      referencingColumn: 'id',
      referencingTable: 'departments',
      // Prevent department deletion if some courses are affilitated to it. Courses must be removed first.
      onDelete: 'restrict',
    },
  },
  courseAssignments: {
    teacherId: {
      constraintName: 'fk_course_assignments_teacher_id',
      columnName: 'teacher_id',
      referencingColumn: 'teacher_id',
      referencingTable: 'teachers',
      // Prevent teacher deletion if teacher is teaching some course.
      // Assign new teacher first to the course and class first.
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
      onDelete: 'cascade',
    },
    pinnedBy: {
      constraintName: 'fk_posts_pinned_by',
      columnName: 'pinned_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Need more consideration.
      onDelete: 'set null',
    },
    deletedBy: {
      constraintName: 'fk_posts_deleted_by',
      columnName: 'deleted_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Seems good.
      onDelete: 'set null',
    },
    createdBy: {
      constraintName: 'fk_posts_created_by',
      columnName: 'created_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Seems good.
      onDelete: 'no action',
    },
    updatedBy: {
      constraintName: 'fk_posts_updated_by',
      columnName: 'updated_by',
      referencingColumn: 'id',
      referencingTable: 'users',
      // Need more consideration.
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
      // Prevent user deletion if he has assigned moderator role to someone.
      onDelete: 'restrict',
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