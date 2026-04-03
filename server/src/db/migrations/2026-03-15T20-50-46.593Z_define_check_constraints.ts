import type { Expression, Kysely, SqlBool } from 'kysely'
import { sql } from 'kysely'
import { TABLE_NAMES } from '../types.js'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Constants

// Derived from LOOKUP_DATA.channelTypes.value in seed_lookup_tables migration
const CHANNEL_TYPES = {
  ANNOUNCEMENTS: 'announcements',
  COURSE: 'course',
  PROGRAM: 'program',
  GENERAL: 'general',
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
  disciplines: {
    disciplinesSnakeCasedValue: {
      tableName: TABLE_NAMES.disciplines,
      constraintName: `chk_${TABLE_NAMES.disciplines}_snake_cased_value`,
      // Use snake_case names for value
      sqlExpression: sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`,
    },
  },
  degreeLevels: {
    degreeLevelsSnakeCasedValue: {
      tableName: TABLE_NAMES.degreeLevels,
      constraintName: `chk_${TABLE_NAMES.degreeLevels}_snake_cased_value`,
      // Use snake_case names for value
      sqlExpression: sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`,
    },
  },
  programs: {
    programSemestersPositive: {
      tableName: TABLE_NAMES.programs,
      constraintName: `chk_${TABLE_NAMES.programs}_semester_positive`,
      sqlExpression: sql<boolean>`semesters > 0`,
    },
  },
  // userTypes: {
  //   userTypes: {
  //     tableName: TABLE_NAMES.userTypes,
  //     constraintName: `chk_${TABLE_NAMES.userTypes}_user_type`,
  //     // Supported user types
  //     sqlExpression: sql<boolean>`value IN ('student', 'teacher', 'admin')`,
  //   },
  // },
  users: {
    usersGender: {
      tableName: TABLE_NAMES.users,
      constraintName: `chk_${TABLE_NAMES.users}_gender`,
      sqlExpression: sql<boolean>`gender IN ('male', 'female')`,
    },
  },
  designations: {
    designationsSnakeCasedValue: {
      tableName: TABLE_NAMES.designations,
      constraintName: `chk_${TABLE_NAMES.designations}_snake_cased_value`,
      // Use snake_case names for value
      sqlExpression: sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`,
    },
  },
  classes: {
    classesSections: {
      tableName: TABLE_NAMES.classes,
      constraintName: `chk_${TABLE_NAMES.classes}_sections`,
      sqlExpression: sql<boolean>`section IN ('A', 'B')`,
    },
  },
  serverTypes: {
    // serverTypes: {
    //   tableName: TABLE_NAMES.serverTypes,
    //   constraintName: `chk_${TABLE_NAMES.serverTypes}_server_types`,
    //   sqlExpression: sql<boolean>`value IN ('department', 'class', 'society')`,
    // },
    serverTypesSnakeCasedValue: {
      tableName: TABLE_NAMES.serverTypes,
      constraintName: `chk_${TABLE_NAMES.serverTypes}_snake_cased_value`,
      // Use snake_case names for value
      sqlExpression: sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`,
    },
  },
  channelTypes: {
    channelTypesSnakeCasedValue: {
      tableName: TABLE_NAMES.channelTypes,
      constraintName: `chk_${TABLE_NAMES.channelTypes}_snake_cased_value`,
      // Use snake_case names for value
      sqlExpression: sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`,
    },
  },
  channels: {
    courseChannelNeedsCourseLinkOnly: {
      tableName: TABLE_NAMES.channels,
      constraintName: `chk_${TABLE_NAMES.channels}_type_course_link_course_only`,
      // Need raw sql conversion due to the use of string interpolation
      sqlExpression: sql<boolean>`${sql.raw(`(type != '${CHANNEL_TYPES.COURSE}') OR (course_id IS NOT NULL AND program_id IS NULL)`)}`,
    },
    programChannelNeedsProgramLinkOnly: {
      tableName: TABLE_NAMES.channels,
      constraintName: `chk_${TABLE_NAMES.channels}_type_program_link_program_only`,
      // Need raw sql conversion due to the use of string interpolation
      sqlExpression: sql<boolean>`${sql.raw(`(type != '${CHANNEL_TYPES.PROGRAM}') OR (program_id IS NOT NULL AND course_id IS NULL)`)}`,
    },
    announcementGeneralChannelsNoLinks: {
      tableName: TABLE_NAMES.channels,
      constraintName: `chk_${TABLE_NAMES.channels}_announcement_general_no_links`,
      // Need raw sql conversion due to the use of string interpolation
      sqlExpression: sql<boolean>`${sql.raw(`(type NOT IN ('${CHANNEL_TYPES.ANNOUNCEMENTS}', '${CHANNEL_TYPES.GENERAL}')) OR (course_id IS NULL AND program_id IS NULL)`)}`,
    },
  },
  societyMembershipRequests: {
    societyMembershipRequestsStatus: {
      tableName: TABLE_NAMES.societyMembershipRequests,
      constraintName: `chk_${TABLE_NAMES.societyMembershipRequests}_status`,
      sqlExpression: sql<boolean>`status IN ('pending', 'approved', 'rejected')`,
    },
  },
  courses: {
    creditHoursPositive: {
      tableName: TABLE_NAMES.courses,
      constraintName: `chk_${TABLE_NAMES.courses}_credit_hours_positive`,
      sqlExpression: sql<boolean>`credit_hours > 0`,
    },
  },
  posts: {
    postsPriority: {
      tableName: TABLE_NAMES.posts,
      constraintName: `chk_${TABLE_NAMES.posts}_priority`,
      sqlExpression: sql<boolean>`priority IN ('normal', 'important', 'urgent')`,
    },
  },
  userRoles: {
    userRolesSnakeCasedValue: {
      tableName: TABLE_NAMES.userRoles,
      constraintName: `chk_${TABLE_NAMES.userRoles}_snake_cased_value`,
      // Use snake_case names for value
      sqlExpression: sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`,
    },
  },
  permissions: {
    snakeCasedActionPermission: {
      tableName: TABLE_NAMES.permissions,
      constraintName: `chk_${TABLE_NAMES.permissions}_snake_cased_permissions_names`,
      // Use snake_case names for value
      sqlExpression: sql<boolean>`(action ~ '^[a-z]+(_[a-z]+)*$') AND (resource ~ '^[a-z]+(_[a-z]+)*$')`,
    },
  },
  userRoleAssignments: {
    exactlyOneScope: {
      tableName: TABLE_NAMES.userRoleAssignments,
      constraintName: `chk_${TABLE_NAMES.userRoleAssignments}_exactly_one_scope`,
      sqlExpression: sql<boolean>`
       (server_id IS NOT NULL AND channel_id IS NULL) OR 
       (server_id IS NULL AND channel_id IS NOT NULL)`,
    },
  },
  notificationTypes: {
    snakeCasedValue: {
      tableName: TABLE_NAMES.notificationTypes,
      constraintName: `chk_${TABLE_NAMES.notificationTypes}_snake_cased_value`,
      // Use snake_case names for value
      sqlExpression: sql<boolean>`value ~ '^[a-z]+(_[a-z]+)*$'`,
    },
  },
  notificationPreferences: {
    scope: {
      tableName: TABLE_NAMES.notificationPreferences,
      constraintName: `chk_${TABLE_NAMES.notificationPreferences}_scope`,
      sqlExpression: sql<boolean>`scope IN ('server', 'channel')`,
    },
    exactlyOneScope: {
      tableName: TABLE_NAMES.notificationPreferences,
      constraintName: `chk_${TABLE_NAMES.notificationPreferences}_exactly_one_scope`,
      sqlExpression: sql<boolean>`
     (scope = 'server' AND server_id IS NOT NULL AND channel_id IS NULL) OR
     (scope = 'channel' AND channel_id IS NOT NULL AND server_id IS NULL)`,
    },
  },
  refreshTokens: {
    expiresAfterCreation: {
      tableName: TABLE_NAMES.refreshTokens,
      constraintName: `chk_${TABLE_NAMES.refreshTokens}_expires_after_creation`,
      sqlExpression: sql<boolean>`expires_at > created_at`,
    },
  },
}