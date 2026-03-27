import type { Expression, Kysely, SqlBool } from 'kysely'
import { sql } from 'kysely'
import { TABLE_NAMES } from '../types.js'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Constants

// Derived from LOOKUP_DATA.channelTypes.value in seed_lookup_tables migration
const CHANNEL_TYPES = {
  ANNOUNCEMENTS: 'ANN',
  COURSE: 'CRS',
  PROGRAM: 'PROG',
  GENERAL: 'GEN',
}

export async function up(db: Kysely<any>): Promise<void> {

  for (const tableChkConstraints of Object.values(CHECK_CONSTRAINTS))
    for (const tableChkConstraint of Object.values(tableChkConstraints))
      await db.schema
        .alterTable(tableChkConstraint.tableName)
        .addCheckConstraint(tableChkConstraint.constraintName, tableChkConstraint.sqlExpression)
        .execute()

}

export async function down(db: Kysely<any>): Promise<void> {

  for (const tableChkConstraints of Object.values(CHECK_CONSTRAINTS))
    for (const tableChkConstraint of Object.values(tableChkConstraints))
      await db.schema
        .alterTable(tableChkConstraint.tableName)
        .dropConstraint(tableChkConstraint.constraintName)
        .ifExists()
        .execute()
}

interface ChkConstraint {
  tableName: string
  constraintName: string
  sqlExpression: Expression<SqlBool>
}

type ChkConstraints = Partial<Record<keyof typeof TABLE_NAMES, Record<string, ChkConstraint>>>

const CHECK_CONSTRAINTS: ChkConstraints = {
  programs: {
    programSemestersPositive: {
      tableName: TABLE_NAMES.programs,
      constraintName: 'chk_programs_semester_positive',
      sqlExpression: sql<boolean>`semesters > 0`,
    },
  },
  channels: {
    courseChannelNeedsCourseLinkOnly: {
      tableName: TABLE_NAMES.channels,
      constraintName: 'chk_channels_type_course_link_course_only',
      // Need raw sql conversion due to the use of string interpolation
      sqlExpression: sql<boolean>`${sql.raw(`(type != '${CHANNEL_TYPES.COURSE}') OR (course_id IS NOT NULL AND program_id IS NULL)`)}`,
    },
    programChannelNeedsProgramLinkOnly: {
      tableName: TABLE_NAMES.channels,
      constraintName: 'chk_channels_type_program_link_program_only',
      // Need raw sql conversion due to the use of string interpolation
      sqlExpression: sql<boolean>`${sql.raw(`(type != '${CHANNEL_TYPES.PROGRAM}') OR (program_id IS NOT NULL AND course_id IS NULL)`)}`,
    },
    announcementGeneralChannelsNoLinks: {
      tableName: TABLE_NAMES.channels,
      constraintName: 'chk_channels_announcement_general_no_links',
      // Need raw sql conversion due to the use of string interpolation
      sqlExpression: sql<boolean>`${sql.raw(`(type NOT IN ('${CHANNEL_TYPES.ANNOUNCEMENTS}', '${CHANNEL_TYPES.GENERAL}')) OR (course_id IS NULL AND program_id IS NULL)`)}`,
    },
  },
  courses: {
    creditHoursPositive: {
      tableName: TABLE_NAMES.courses,
      constraintName: 'chk_courses_credit_hours_positive',
      sqlExpression: sql<boolean>`credit_hours > 0`,
    },
  },
  notificationPreferences: {
    exactlyOneScope: {
      tableName: TABLE_NAMES.notificationPreferences,
      constraintName: 'chk_notification_preferences_exactly_one_scope',
      sqlExpression: sql<boolean>`
     (scope_type = 'server' AND server_id IS NOT NULL AND channel_id IS NULL) OR
     (scope_type = 'channel' AND channel_id IS NOT NULL AND server_id IS NULL)`,
    },
  },
  userRoleAssignments: {
    exactlyOneScope: {
      tableName: TABLE_NAMES.userRoleAssignments,
      constraintName: 'chk_user_role_assignments_exactly_one_scope',
      sqlExpression: sql<boolean>`
       (server_id IS NOT NULL AND channel_id IS NULL) OR 
       (server_id IS NULL AND channel_id IS NOT NULL)`,
    },
  },
  refreshTokens: {
    expiresAfterCreation: {
      tableName: TABLE_NAMES.refreshTokens,
      constraintName: 'chk_refresh_tokens_expires_after_creation',
      sqlExpression: sql<boolean>`expires_at > created_at`,
    },
  },
}