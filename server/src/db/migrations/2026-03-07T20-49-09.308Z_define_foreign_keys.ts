/* eslint-disable @typescript-eslint/no-explicit-any */

// This migration will define all foreign key constraints

import type { Kysely } from 'kysely'
import { TABLE_NAMES } from '../types.js'

export async function up(db: Kysely<any>): Promise<void> {

  for (const [camelCasedTableName, fkConstraints] of Object.entries(FK_CONSTRAINTS)) {

    const snakeCasedTableName = TABLE_NAMES[camelCasedTableName as keyof typeof TABLE_NAMES]

    for (const fkConstraint of Object.values(fkConstraints)) {
      let query = db.schema
        .alterTable(snakeCasedTableName)
        .addForeignKeyConstraint(
          fkConstraint.constraintName,
          [fkConstraint.columnName],
          fkConstraint.referencingTable,
          [fkConstraint.referencingColumn],
        )
        .onDelete(fkConstraint.onDelete)

      if (fkConstraint.onUpdate)
        query = query.onUpdate(fkConstraint.onUpdate)

      await query.execute()
    }
  }
}

export async function down(db: Kysely<any>): Promise<void> {

  for (const [camelCasedTableName, fkConstraints] of Object.entries(FK_CONSTRAINTS).reverse()) {

    const snakeCasedTableName = TABLE_NAMES[camelCasedTableName as keyof typeof TABLE_NAMES]

    for (const fkConstraint of Object.values(fkConstraints))
      await db.schema
        .alterTable(snakeCasedTableName)
        .dropConstraint(fkConstraint.constraintName)
        .ifExists()
        .execute()
  }
}

interface FkConstraint {
  constraintName: string
  columnName: string
  referencingColumn: string
  referencingTable: string
  onDelete: 'restrict' | 'cascade' | 'set null' | 'set default' | 'no action'
  onUpdate?: 'restrict' | 'cascade' | 'set null' | 'set default' | 'no action'
}

type TableFkConstraints = Partial<Record<keyof typeof TABLE_NAMES, Record<string, FkConstraint>>>

// Single source of truth for everything related about foreign key constraints
const FK_CONSTRAINTS: TableFkConstraints = {
  departments: {
    hodId: {
      constraintName: `fk_${TABLE_NAMES.departments}_hod_id`,
      columnName: 'hod_id',
      referencingColumn: 'teacher_id',
      referencingTable: TABLE_NAMES.teachers,
      // Prevent teacher deletion if he is HOD.
      // New HOD must be assigned first.
      // Rule is same for both soft and hard deletes
      onDelete: 'restrict',
    },
    serverId: {
      constraintName: `fk_${TABLE_NAMES.departments}_server_id`,
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.servers,
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
      constraintName: `fk_${TABLE_NAMES.programs}_department_id`,
      columnName: 'department_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.departments,
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
      constraintName: `fk_${TABLE_NAMES.programs}_discipline`,
      columnName: 'discipline',
      referencingColumn: 'value',
      referencingTable: TABLE_NAMES.disciplines,
      // Prevent hard deletion of discipline if it is already offered by department at some degree level
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
    degreeLevel: {
      constraintName: `fk_${TABLE_NAMES.programs}_degree_level`,
      columnName: 'degree_level',
      referencingColumn: 'value',
      referencingTable: TABLE_NAMES.degreeLevels,
      // Prevent hard deletion of degree level if it is already offered by department in some discipline
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
    programDirectorId: {
      constraintName: `fk_${TABLE_NAMES.programs}_program_director_id`,
      columnName: 'program_director_id',
      referencingColumn: 'teacher_id',
      referencingTable: TABLE_NAMES.teachers,
      // Prevent teacher deletion if teacher is a Program Director.
      // New director must be assigned first.
      // Rule is same for both soft and hard deletes
      onDelete: 'restrict',
    },
  },
  programCurricula: {
    programId: {
      constraintName: `fk_${TABLE_NAMES.programCurricula}_program_id`,
      columnName: 'program_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.programs,
      // Delete curriculum record if program is being deleted
      onDelete: 'cascade',
    },
    courseId: {
      constraintName: `fk_${TABLE_NAMES.programCurricula}_course_id`,
      columnName: 'course_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.courses,
      // Prevent course deletion if it is being taught in some program
      onDelete: 'restrict',
    },
  },
  users: {
    deletedBy: {
      constraintName: `fk_${TABLE_NAMES.users}_deleted_by`,
      columnName: 'deleted_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. User remains soft-deleted; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  userTypeAssignments: {
    userId: {
      constraintName: `fk_${TABLE_NAMES.userTypeAssignments}_user_id`,
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Clear assignments if user is hard deleted
      // Hard Delete: CASCADE, Soft Delete: leave intact
      onDelete: 'cascade',
    },
    type: {
      constraintName: `fk_${TABLE_NAMES.userTypeAssignments}_type`,
      columnName: 'type',
      referencingColumn: 'value',
      referencingTable: TABLE_NAMES.userTypes,
      // Prevent hard deletion of user type if some user in the system has that type
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
  },
  students: {
    studentId: {
      constraintName: `fk_${TABLE_NAMES.students}_student_id`,
      columnName: 'student_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Delete student if referencing user row is being deleted
      // Hard Delete: CASCADE, Soft Delete: leave intact
      onDelete: 'cascade',
    },
    classId: {
      constraintName: `fk_${TABLE_NAMES.students}_class_id`,
      columnName: 'class_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.classes,
      // Prevent class deletion if class has students.
      onDelete: 'restrict',
    },
  },
  teachers: {
    teacherId: {
      constraintName: `fk_${TABLE_NAMES.teachers}_teacher_id`,
      columnName: 'teacher_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Delete teacher if referencing user row is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact
      onDelete: 'cascade',
    },
    departmentId: {
      constraintName: `fk_${TABLE_NAMES.teachers}_department_id`,
      columnName: 'department_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.departments,
      // Prevent hard deletion of department if it has any teacher.
      // Teachers must be cleaned up or moved to another department first
      onDelete: 'restrict',
    },
    designation: {
      constraintName: `fk_${TABLE_NAMES.teachers}_designation`,
      columnName: 'designation',
      referencingColumn: 'value',
      referencingTable: TABLE_NAMES.designations,
      // Restrct deletion of designation if some user has been assigned to it
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
  },
  classes: {
    programId: {
      constraintName: `fk_${TABLE_NAMES.classes}_program_id`,
      columnName: 'program_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.programs,
      // Prevent program deletion if some class is enrolled in the program.
      onDelete: 'restrict',
    },
    crId: {
      constraintName: `fk_${TABLE_NAMES.classes}_cr_id`,
      columnName: 'cr_id',
      referencingColumn: 'student_id',
      referencingTable: TABLE_NAMES.students,
      // Prevent student deletion if student is cr.
      // New CR must be assigned first.
      // Rule is same for both soft and hard deletes.
      onDelete: 'restrict',
    },
    serverId: {
      constraintName: `fk_${TABLE_NAMES.classes}_server_id`,
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.servers,
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
      constraintName: `fk_${TABLE_NAMES.societies}_department_id`,
      columnName: 'department_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.departments,
      // Prevent department deletion if department is managing some society.
      // Society must be moved to other department or deleted first.
      onDelete: 'restrict',
    },
    presidentId: {
      constraintName: `fk_${TABLE_NAMES.societies}_president_id`,
      columnName: 'president_id',
      referencingColumn: 'student_id',
      referencingTable: TABLE_NAMES.students,
      // Prevent student deletion if student is president of some society.
      // New president must be assigned first.
      // Rule is same for both soft and hard deletes
      onDelete: 'restrict',
    },
    convenorId: {
      constraintName: `fk_${TABLE_NAMES.societies}_convenor_id`,
      columnName: 'convenor_id',
      referencingColumn: 'teacher_id',
      referencingTable: TABLE_NAMES.teachers,
      // Prevent teacher deletion if teacher is convenor of some society.
      // New Society Convenor must be assigned first.
      onDelete: 'restrict',
    },
    deletedBy: {
      constraintName: `fk_${TABLE_NAMES.societies}_deleted_by`,
      columnName: 'deleted_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Society remains soft-deleted; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    serverId: {
      constraintName: `fk_${TABLE_NAMES.societies}_server_id`,
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.servers,
      // Society owns its server not vice versa.
      /* For hard deletion of server, first all channels associated with it must be hard deleted
          (hard deletion of channels would trigger its own cascade chain. See posts.channel_id)
      */
      onDelete: 'restrict',
    },
  },
  servers: {
    type: {
      constraintName: `fk_${TABLE_NAMES.servers}_type`,
      columnName: 'type',
      referencingColumn: 'value',
      referencingTable: TABLE_NAMES.serverTypes,
      // Prevent hard deletion of server type if there is any server in the system with that type
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
    deletedBy: {
      constraintName: `fk_${TABLE_NAMES.servers}_deleted_by`,
      columnName: 'deleted_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Server remains soft-deleted; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    createdBy: {
      constraintName: `fk_${TABLE_NAMES.servers}_created_by`,
      columnName: 'created_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Server remains intact; only the creator identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  channels: {
    type: {
      constraintName: `fk_${TABLE_NAMES.channels}_type`,
      columnName: 'type',
      referencingColumn: 'value',
      referencingTable: TABLE_NAMES.channelTypes,
      // Prevent hard deletion of channel type if there is already any channel in the system with that type
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
    serverId: {
      constraintName: `fk_${TABLE_NAMES.channels}_server_id`,
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.servers,
      // Prevent server deletion if it has a channel.
      /* Channel must be hard deleted first.
        hard deletion of channels would trigger its own cascade chain. See posts.channel_id
      */
      onDelete: 'restrict',
    },
    courseId: {
      constraintName: `fk_${TABLE_NAMES.channels}_course_id`,
      columnName: 'course_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.courses,
      // Prevent course deletion if that course is being taught to some class (class server has course channel)
      onDelete: 'restrict',
    },
    programId: {
      constraintName: `fk_${TABLE_NAMES.channels}_program_id`,
      columnName: 'program_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.programs,
      // Delete program channel if program is being deleted
      onDelete: 'cascade',
    },
    lockedBy: {
      constraintName: `fk_${TABLE_NAMES.channels}_locked_by`,
      columnName: 'locked_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Channel remains locked; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    archivedBy: {
      constraintName: `fk_${TABLE_NAMES.channels}_archived_by`,
      columnName: 'archived_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Channel remains archived; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    deletedBy: {
      constraintName: `fk_${TABLE_NAMES.channels}_deleted_by`,
      columnName: 'deleted_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Channel remains soft-deleted; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    createdBy: {
      constraintName: `fk_${TABLE_NAMES.channels}_created_by`,
      columnName: 'created_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Channel remains intact; only the creator identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  serverMemberships: {
    userId: {
      constraintName: `fk_${TABLE_NAMES.serverMemberships}_user_id`,
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Clear membership record if user is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    serverId: {
      constraintName: `fk_${TABLE_NAMES.serverMemberships}_server_id`,
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.servers,
      // Clear membership record if server is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
  },
  societyMembershipRequests: {
    societyId: {
      constraintName: `fk_${TABLE_NAMES.societyMembershipRequests}_society_id`,
      columnName: 'society_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.societies,
      // Clear record if society is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    userId: {
      constraintName: `fk_${TABLE_NAMES.societyMembershipRequests}_user_id`,
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Clear record if user is being deleted.
      // Hard Delete: CASCADE, Soft DELETE: delete pending requests only
      onDelete: 'cascade',
    },
    reviewedBy: {
      constraintName: `fk_${TABLE_NAMES.societyMembershipRequests}_reviewed_by`,
      columnName: 'reviewed_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. status remains intact; only the reviewer identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  courses: {
    departmentId: {
      constraintName: `fk_${TABLE_NAMES.courses}_department_id`,
      columnName: 'department_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.departments,
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
      constraintName: `fk_${TABLE_NAMES.courseAssignments}_teacher_id`,
      columnName: 'teacher_id',
      referencingColumn: 'teacher_id',
      referencingTable: TABLE_NAMES.teachers,
      // Prevent teacher deletion if teacher is teaching some course.
      // Assign new teacher to the course and class first.
      // Same rule for both soft and hard deletions
      onDelete: 'restrict',
    },
    courseId: {
      constraintName: `fk_${TABLE_NAMES.courseAssignments}_course_id`,
      columnName: 'course_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.courses,
      // Prevent course deletion if course is being taught to a class.
      // First un assign the course
      onDelete: 'restrict',
    },
    classId: {
      constraintName: `fk_${TABLE_NAMES.courseAssignments}_class_id`,
      columnName: 'class_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.classes,
      // Prevent class deletion if a teacher is teaching some course to the class.
      // First remove the course_assignment
      onDelete: 'restrict',
    },
  },
  posts: {
    channelId: {
      constraintName: `fk_${TABLE_NAMES.posts}_channel_id`,
      columnName: 'channel_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.channels,
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
      constraintName: `fk_${TABLE_NAMES.posts}_pinned_by`,
      columnName: 'pinned_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Post remains pinned; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    deletedBy: {
      constraintName: `fk_${TABLE_NAMES.posts}_deleted_by`,
      columnName: 'deleted_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Post remains soft-deleted; only the actor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
    createdBy: {
      constraintName: `fk_${TABLE_NAMES.posts}_created_by`,
      columnName: 'created_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Prevent user hard-deletion if user has created posts.
      // Hard Delete: RESTRICT, Soft Delete: leave intact.
      onDelete: 'restrict',
    },
    updatedBy: {
      constraintName: `fk_${TABLE_NAMES.posts}_updated_by`,
      columnName: 'updated_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Post remains intact; only the last-editor identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  postAttachments: {
    postId: {
      constraintName: `fk_${TABLE_NAMES.postAttachments}_post_id`,
      columnName: 'post_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.posts,
      // Clear post attachements if a post is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    type: {
      constraintName: `fk_${TABLE_NAMES.postAttachments}_type`,
      columnName: 'type',
      referencingColumn: 'value',
      referencingTable: TABLE_NAMES.postAttachmentTypes,
      // Prevent hard deletion of attachment type if its already used
      onDelete: 'restrict',
      onUpdate: 'cascade',
    },
  },
  userRolePermissions: {
    role: {
      constraintName: `fk_${TABLE_NAMES.userRolePermissions}_role`,
      columnName: 'role',
      referencingColumn: 'value',
      referencingTable: TABLE_NAMES.userRoles,
      // Clear permissions for the role which is being deleted.
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    permissionId: {
      constraintName: `fk_${TABLE_NAMES.userRolePermissions}_permission_id`,
      columnName: 'permission_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.permissions,
      // Remove role permission if a permission is being deleted.
      onDelete: 'cascade',
    },
  },
  userRoleAssignments: {
    userId: {
      constraintName: `fk_${TABLE_NAMES.userRoleAssignments}_user_id`,
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Clear assignment if a user is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    role: {
      constraintName: `fk_${TABLE_NAMES.userRoleAssignments}_role`,
      columnName: 'role',
      referencingColumn: 'value',
      referencingTable: TABLE_NAMES.userRoles,
      // Clear assignment if role is being deleted
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    serverId: {
      constraintName: `fk_${TABLE_NAMES.userRoleAssignments}_server_id`,
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.servers,
      // Clear assignments for server if server is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    channelId: {
      constraintName: `fk_${TABLE_NAMES.userRoleAssignments}_channel_id`,
      columnName: 'channel_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.channels,
      // Clear assignment for channel if channel is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    assignedBy: {
      constraintName: `fk_${TABLE_NAMES.userRoleAssignments}_assigned_by`,
      columnName: 'assigned_by',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Nullable audit column. Assignment remains intact; only the assigner identity is lost in case of hard delete.
      // Hard Delete: SET NULL, Soft Delete: leave intact.
      onDelete: 'set null',
    },
  },
  notifications: {
    type: {
      constraintName: `fk_${TABLE_NAMES.notifications}_type`,
      columnName: 'type',
      referencingColumn: 'value',
      referencingTable: TABLE_NAMES.notificationTypes,
      // Remove all notifications if notification type is being deleted
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    userId: {
      constraintName: `fk_${TABLE_NAMES.notifications}_user_id`,
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Clear notifications if a user is being deleted.
      // CASCADE both soft and hard deletions
      onDelete: 'cascade',
    },
    postId: {
      constraintName: `fk_${TABLE_NAMES.notifications}_post_id`,
      columnName: 'post_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.posts,
      // Clear notifications if a post is being deleted.
      // CASCADE for both soft and hard deletions
      onDelete: 'cascade',
    },
  },
  notificationPreferences: {
    userId: {
      constraintName: `fk_${TABLE_NAMES.notificationPreferences}_user_id`,
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Clear preferences if a user is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    serverId: {
      constraintName: `fk_${TABLE_NAMES.notificationPreferences}_server_id`,
      columnName: 'server_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.servers,
      // Clear preferences for the server which is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
    channelId: {
      constraintName: `fk_${TABLE_NAMES.notificationPreferences}_channel_id`,
      columnName: 'channel_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.channels,
      // Clear preferences for the channel which is being deleted.
      // Hard Delete: CASCADE, Soft Delete: leave intact.
      onDelete: 'cascade',
    },
  },
  refreshTokens: {
    userId: {
      constraintName: `fk_${TABLE_NAMES.refreshTokens}_user_id`,
      columnName: 'user_id',
      referencingColumn: 'id',
      referencingTable: TABLE_NAMES.users,
      // Clear tokens for the user being deleted.
      // CASCADE for both soft and hard deletions
      onDelete: 'cascade',
    },
  },
} as const satisfies TableFkConstraints