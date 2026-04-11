import type { Kysely, Expression, SqlBool } from 'kysely'
import type { TABLE_NAMES } from './2026-03-07T02-23-50.616Z_create_tables.js'
import { sql } from 'kysely'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Defines performance-related constraints (indexes).
 * Note: Data integrity and relationship constraints (Unique, Foreign Keys, Primary keys) are defined in previous migrations and documented here.
 */

export async function up(db: Kysely<any>): Promise<void> {

  for (const indexes of Object.values(INDEXES)) {
    for (const index of Object.values(indexes)) {
      let query = db.schema
        .createIndex(index.name)
        .on(index.onTable)
        .columns(index.onColumns)

      if (index.where)
        query = query.where(index.where)

      await query.execute()
    }
  }
}

export async function down(db: Kysely<any>): Promise<void> {

  for (const indexes of Object.values(INDEXES))
    for (const index of Object.values(indexes))
      await db.schema
        .dropIndex(index.name)
        .ifExists()
        .execute()

}

// Types and constants
interface Index {
  // name should follow the pattern: idx_{table_name}_{column_names_joined_by_underscore}
  name: string
  onTable: typeof TABLE_NAMES[keyof typeof TABLE_NAMES]
  onColumns: string[]
  where?: Expression<SqlBool>
}

type TableIndexes = Partial<Record<keyof typeof TABLE_NAMES, Record<string, Index>>>

/**
 * Centralized performance index definitions (Single Source of Truth).
 */
const INDEXES: TableIndexes = {

  /**
   * constraints (indexes) already defined in create_tables
   * - onHodId: unique constraint
   * - onServerId: unique constraint
   * - onName: unique constraint
   * - onCode: unique constraint
   */
  departments: {},

  /**
   * constraints (indexes) already defined in create_tables
   * - onCode: unique constraint
   * - onDisciplineDegreeLevelDepartmentId: unique constraint
   */
  programs: {
    /**
     * Need further consideration onDepartmentId
     ** Almost all queries would probably search for only discipline or discipline + degreeLevel
    */
    onDepartmentId: {
      name: 'idx_programs_department_id',
      onTable: 'programs',
      onColumns: ['department_id'],
    },
    onProgramDirectorId: {
      name: 'idx_programs_program_director_id',
      onTable: 'programs',
      onColumns: ['program_director_id'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onProgramIdBatchYearSemesterNumberCourseId: unique constraint
   */
  programCurricula: {},

  /**
   * constraints (indexes) already defined in create_tables
   * - onPersonalEmail: unique constraint
   * - onUniversityEmail: partial unique constraint for active users
   */
  users: {
    onPublicId: {
      name: 'idx_users_public_id',
      onTable: 'users',
      onColumns: ['public_id'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onUserIdType: primary key constraint
   */
  userTypeAssignments: {
    onType: {
      name: 'idx_user_type_assignments_type',
      onTable: 'user_type_assignments',
      onColumns: ['type'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onRollNumber: unique constraint
   */
  students: {
    onClassId: {
      name: 'idx_students_class_id',
      onTable: 'students',
      onColumns: ['class_id'],
    },
  },

  teachers: {
    onDepartmentId: {
      name: 'idx_teachers_department_id',
      onTable: 'teachers',
      onColumns: ['department_id'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onCr: unique constraint
   * - onServerId: unique constraint
   * - onProgramIdCurrentSemesterSectionAdmissionYear: unique constraint
   */
  classes: {
    onPublicId: {
      name: 'idx_classes_public_id',
      onTable: 'classes',
      onColumns: ['public_id'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onServerId: unique constraint
   * - onSocietyName: partial unique constraint for active societies
   */
  societies: {
    onPublicId: {
      name: 'idx_societies_public_id',
      onTable: 'societies',
      onColumns: ['public_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onDepartmentId: {
      name: 'idx_societies_department_id',
      onTable: 'societies',
      onColumns: ['department_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onPresidentId: {
      name: 'idx_societies_president_id',
      onTable: 'societies',
      onColumns: ['president_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onConvenorId: {
      name: 'idx_societies_convenor_id',
      onTable: 'societies',
      onColumns: ['convenor_id'],
      where: sql<boolean>`is_deleted = false`,
    },
  },

  servers: {
    onPublicId: {
      name: 'idx_servers_public_id',
      onTable: 'servers',
      onColumns: ['public_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onType: {
      name: 'idx_servers_type',
      onTable: 'servers',
      onColumns: ['type'],
      where: sql<boolean>`is_deleted = false`,
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onChannelName: partial unique constraint for active channels
   */
  channels: {
    onPublicId: {
      name: 'idx_channels_public_id',
      onTable: 'channels',
      onColumns: ['public_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onServerIdCourseId: {
      name: 'idx_channels_server_id_course_id',
      onTable: 'channels',
      onColumns: ['server_id', 'course_id'],
      // course type is derived from seed lookup tables migration from 'channel_types' onTable
      where: sql<boolean>`is_deleted = false AND type = 'course'`,
    },
    onServerIdProgramId: {
      name: 'idx_channels_server_id_program_id',
      onTable: 'channels',
      onColumns: ['server_id', 'program_id'],
      // program type is derived from seed lookup tables migration from 'channel_types' onTable
      where: sql<boolean>`is_deleted = false AND type = 'program'`,
    },
    onType: {
      name: 'idx_channels_type',
      onTable: 'channels',
      onColumns: ['type'],
      where: sql<boolean>`is_deleted = false`,
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onUserIdServerId: primary key constraint
   */
  serverMemberships: {
    onServerId: {
      name: 'idx_server_memberships_server_id',
      onTable: 'server_memberships',
      onColumns: ['server_id'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onSocietyIdUserId: partial unique constraint for approved and pending requests
   */
  societyMembershipRequests: {
    onSocietyIdIsReviewed: {
      name: 'idx_society_membership_requests_society_id_is_reviewed',
      onTable: 'society_membership_requests',
      onColumns: ['society_id', 'is_reviewed'],
      where: sql<boolean>`is_reviewed = false`,
    },
    onUserId: {
      name: 'idx_society_membership_requests_user_id',
      onTable: 'society_membership_requests',
      onColumns: ['user_id'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onCourseCode: unique constraint
   */
  courses: {
    onDepartmentId: {
      name: 'idx_courses_department_id',
      onTable: 'courses',
      onColumns: ['department_id'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onClassIdCourseIdTeacherId: primary key constraint
   */
  courseAssignments: {
    onTeacherId: {
      name: 'idx_course_assignments_teacher_id',
      onTable: 'course_assignments',
      onColumns: ['teacher_id'],
    },
  },

  posts: {
    onPublicId: {
      name: 'idx_posts_public_id',
      onTable: 'posts',
      onColumns: ['public_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onChannelIdPriority: {
      name: 'idx_posts_channel_id_priority',
      onTable: 'posts',
      onColumns: ['channel_id', 'priority'],
      where: sql<boolean>`is_deleted = false`,
    },
    onChannelIdCreatedAt: {
      name: 'idx_posts_channel_id_created_at',
      onTable: 'posts',
      onColumns: ['channel_id', 'created_at'],
      where: sql<boolean>`is_deleted = false`,
    },
    onChannelIdIsPinned: {
      name: 'idx_posts_channel_id_is_pinned',
      onTable: 'posts',
      onColumns: ['channel_id', 'is_pinned'],
      where: sql<boolean>`is_deleted = false`,
    },
  },

  postAttachments: {
    onPostId: {
      name: 'idx_post_attachments_post_id',
      onTable: 'post_attachments',
      onColumns: ['post_id'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * onActionResource: unique constraint
   */
  permissions: {},

  /**
   * constraints (indexes) already defined in create_tables
   * - onRolePermissionId: primary key constraint
   */
  userRolePermissions: {},

  /**
   * constraints (indexes) already defined in create_tables
   * - onUserIdRoleServerIdChannelId: NULLS NOT DISTINCT unique constraint
   */
  userRoleAssignments: {
    onServerId: {
      name: 'idx_user_role_assignments_server_id',
      onTable: 'user_role_assignments',
      onColumns: ['server_id'],
    },
    onChannelId: {
      name: 'idx_user_role_assignments_channel_id',
      onTable: 'user_role_assignments',
      onColumns: ['channel_id'],
    },
  },

  notifications: {
    onPostIdUserId: {
      name: 'idx_notifications_post_id_user_id',
      onTable: 'notifications',
      onColumns: ['post_id', 'user_id'],
    },
    onUserIdCreatedAt: {
      name: 'idx_notifications_user_id_created_at',
      onTable: 'notifications',
      onColumns: ['user_id', 'created_at'],
    },
    onUnreadByUser: {
      name: 'idx_notifications_unread_by_user',
      onTable: 'notifications',
      onColumns: ['user_id', 'created_at'],
      where: sql<boolean>`read_at IS NULL`,
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onUserIdServerIdChannelIdScope: unique constraint
   */
  notificationPreferences: {},

  refreshTokens: {
    onUserIdExpiresAtRevokedAt: {
      name: 'idx_refresh_tokens_user_id_expires_at_revoked_at',
      onTable: 'refresh_tokens',
      onColumns: ['user_id', 'expires_at', 'revoked_at'],
    },
  },

} as const satisfies TableIndexes