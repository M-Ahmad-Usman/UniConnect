import type { Kysely, Expression, SqlBool } from 'kysely'
import { TABLE_NAMES } from '../types.js'
import { sql } from 'kysely'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Defines performance-related constraints (indexes).
 * Note: Data integrity and relationship constraints (Unique, Foreign Keys, Primary keys) are defined in previous migrations and documented here.
 */

export async function up(db: Kysely<any>): Promise<void> {

  for (const [camelCasedTableName, indexes] of Object.entries(TABLE_INDEXES)) {

    const snakeCasedTableName = TABLE_NAMES[camelCasedTableName as keyof typeof TABLE_NAMES]

    for (const index of Object.values(indexes)) {
      let query = db.schema
        .createIndex(index.name)
        .on(snakeCasedTableName)
        .columns(index.columns)

      if (index.where) query = query.where(index.where)

      await query.execute()
    }
  }
}

export async function down(db: Kysely<any>): Promise<void> {

  for (const indexes of Object.values(TABLE_INDEXES))
    for (const index of Object.values(indexes))
      await db.schema
        .dropIndex(index.name)
        .ifExists()
        .execute()

}

// Types and constants
interface Index {
  name: string
  columns: string[]
  where?: Expression<SqlBool>
}

type TableIndexes = Partial<Record<keyof typeof TABLE_NAMES, Record<string, Index>>>

/**
 * Centralized performance index definitions (Single Source of Truth).
 */
const TABLE_INDEXES: TableIndexes = {

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
      columns: ['department_id'],
    },
    onProgramDirectorId: {
      name: 'idx_programs_program_director_id',
      columns: ['program_director_id'],
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
      columns: ['public_id'],
      where: sql<boolean>`is_deleted = false`,
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onUserIdType: primary key constraint
   */
  userTypeAssignments: {
    onType: {
      name: 'idx_user_type_assignments_type',
      columns: ['type'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onRollNumber: unique constraint
   */
  students: {
    onClassId: {
      name: 'idx_students_class_id',
      columns: ['class_id'],
    },
  },

  teachers: {
    onDepartmentId: {
      name: 'idx_teachers_department_id',
      columns: ['department_id'],
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
      columns: ['public_id'],
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
      columns: ['public_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onDepartmentId: {
      name: 'idx_societies_department_id',
      columns: ['department_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onPresidentId: {
      name: 'idx_societies_president_id',
      columns: ['president_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onConvenorId: {
      name: 'idx_societies_convenor_id',
      columns: ['convenor_id'],
      where: sql<boolean>`is_deleted = false`,
    },
  },

  servers: {
    onPublicId: {
      name: 'idx_servers_public_id',
      columns: ['public_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onType: {
      name: 'idx_servers_type',
      columns: ['type'],
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
      columns: ['public_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onServerIdCourseId: {
      name: 'idx_channels_server_id_course_id',
      columns: ['server_id', 'course_id'],
      // course type is derived from seed lookup tables migration from 'channel_types' table
      where: sql<boolean>`is_deleted = false AND type = 'course'`,
    },
    onServerIdProgramId: {
      name: 'idx_channels_server_id_program_id',
      columns: ['server_id', 'program_id'],
      // program type is derived from seed lookup tables migration from 'channel_types' table
      where: sql<boolean>`is_deleted = false AND type = 'program'`,
    },
    onType: {
      name: 'idx_channels_type',
      columns: ['type'],
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
      columns: ['server_id'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onSocietyIdUserId: partial unique constraint for approved and pending requests
   */
  societyMembershipRequests: {
    onSocietyIdIsReviewd: {
      name: 'idx_society_membership_requests_society_id_is_reviewed',
      columns: ['society_id', 'is_reviewed'],
      where: sql<boolean>`is_reviewed = false`,
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onCourseCode: unique constraint
   */
  courses: {
    onDepartmentId: {
      name: 'idx_courses_department_id',
      columns: ['department_id'],
    },
  },

  /**
   * constraints (indexes) already defined in create_tables
   * - onClassIdCourseIdTeacherId: primary key constraint
   */
  courseAssignments: {
    onTeacherId: {
      name: 'idx_course_assignments_teacher_id',
      columns: ['teacher_id'],
    },
  },

  posts: {
    onPublicId: {
      name: 'idx_posts_public_id',
      columns: ['public_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onChannelIdPriority: {
      name: 'idx_posts_channel_id_priority',
      columns: ['channel_id', 'priority'],
      where: sql<boolean>`is_deleted = false`,
    },
    onChannelIdCreatedAt: {
      name: 'idx_posts_channel_id_created_at',
      columns: ['channel_id', 'created_at'],
      where: sql<boolean>`is_deleted = false`,
    },
  },

  postAttachments: {
    onPostId: {
      name: 'idx_post_attachments_post_id',
      columns: ['post_id'],
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
      columns: ['server_id'],
    },
    onChannelId: {
      name: 'idx_user_role_assignments_channel_id',
      columns: ['channel_id'],
    },
  },

  notifications: {
    onPostIdUserId: {
      name: 'idx_notifications_post_id_user_id',
      columns: ['post_id', 'user_id'],
    },
    onUserIdCreatedAt: {
      name: 'idx_notifications_user_id_created_at',
      columns: ['user_id', 'created_at'],
    },
    onUnreadByUser: {
      name: 'idx_notifications_unread_by_user',
      columns: ['user_id', 'created_at'],
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
      columns: ['user_id', 'expires_at', 'revoked_at'],
    },
  },

} as const satisfies TableIndexes