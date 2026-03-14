import type { Kysely, Expression, SqlBool } from 'kysely'
import { TABLE_NAMES } from '../types.js'
import { sql } from 'kysely'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Defines performance-related constraints (indexes).
 * * Note: Data integrity constraints (Unique, Foreign Keys)
 * * * are defined in the `create_tables` migration and documented here.
 */

export async function up(db: Kysely<any>): Promise<void> {

  for (const [camelCasedTableName, indexes] of Object.entries(TABLE_INDEXES)) {

    const snakeCasedTableName = TABLE_NAMES[camelCasedTableName as keyof typeof TABLE_NAMES]

    for (const index of Object.values(indexes) ) {
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
      await db.schema.dropIndex(index.name).execute()

}

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
   * constraints already defined in create_tables
   * - onHodId: unique constraint
   * - onServerId: unique constraint
   * - onName: unique constraint
   * - onCode: unique constraint
   */
  departments: {},

  /**
   * constraints already defined in create_tables
   * - onCode: unique constraint
   * - onDisciplineDegreeLevelDepartmentId: unique constraint
   */
  programs: {
    // Should I add this index. This field is already covered by unique program index
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
   * constraints already defined in create_tables
   * - onProgramIdBatchYearSemesterNumberCourseId: unique constraint
   */
  programCurricula: {},

  /**
   * constraints already defined in create_tables
   * - onPersonalEmail: unique constraint
   * - onUniversityEmail: partial unique constraint for active users
   */
  users: {
    onPublicId: {
      name: 'idx_users_public_id',
      columns: ['public_id'],
      where: sql<boolean>`is_deleted = false`,
    },
    onDepartmentIdType: {
      name: 'idx_users_department_id_type',
      columns: ['department_id', 'type'],
    },
  },

  /**
   * constraints already defined in create_tables
   * - onRollNumber: unique constraint
   */
  students: {
    onClassId: {
      name: 'idx_students_class_id',
      columns: ['class_id'],
    },
  },

  /**
   * constraints already defined in create_tables
   * - onCr: unique constraint
   * - onServerId: unique constraint
   * - onProgramIdCurrentSemesterSectionAdmissionYear: unique constraint
   */
  classes: {
    onPublicId: {
      name: 'idx_classes_public_id',
      columns: ['public_id'],
    },
    onServerId: {
      name: 'idx_classes_server_id',
      columns: ['server_id'],
    },
  },

  /**
   * constraints already defined in create_tables
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
  },

  /**
   * constraints already defined in create_tables
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
      where: sql<boolean>`is_deleted = false`,
    },
    onServerIdProgramId: {
      name: 'idx_channels_server_id_program_id',
      columns: ['server_id', 'program_id'],
      where: sql<boolean>`is_deleted = false`,
    },
  },

  /**
   * constraints already defined in create_tables
   * - onSocietyIdUserId: partial unique constraint for approved and pending requests
   */
  societyMembershipRequests: {},

  /**
   * constraints already defined in create_tables
   * - onCourseCode: unique constraint
   */
  courses: {
    onDepartmentId: {
      name: 'idx_courses_department_id',
      columns: ['department_id'],
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
    },
    onChannelIdCreatedAt: {
      name: 'idx_posts_channel_id_created_at',
      columns: ['channel_id', 'created_at'],
    },
  },

  postAttachments: {
    onPostId: {
      name: 'idx_post_attachments_post_id',
      columns: ['post_id'],
    },
  },

  /**
   * constraints already defined in create_tables
   * - onServerIdChannelIdUserId: NULLS NOT DISTINCT unique constraint
   */
  moderatorAssignments: {},

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
   * constraints already defined in create_tables
   * - onUserIdServerIdChannelIdScopeType: unique constraint
   */
  notificationPreferences: {},

  refreshTokens: {
    onUserIdExpiresAtRevokedAt: {
      name: 'idx_refresh_tokens_user_id_expires_at_revoked_at',
      columns: ['user_id', 'expires_at', 'revoked_at'],
    },
  },

} as const satisfies TableIndexes