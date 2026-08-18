/**
 * Database constants and derived types.
 *
 * This file is the SINGLE SOURCE OF TRUTH for:
 * - CHECK constraint values (Gender, ClassSection, etc.)
 * - Fixed lookup table values. 'fixed' here means that inserting new values in these tables require application updates.
 *   Lookup tables like 'disciplines' and 'designations' aren't here since adding new in them wouldn't require new updates.
 * - Size values for attributes with varchar type
 *
 * IMPORTANT: Migrations do NOT import from this file.
 * Each migration contains its own hardcoded data to ensure determinism.
 * When adding new values (lookup or static CHECK lists):
 * 1. Add here (for TypeScript types + app layer)
 * 2. Write a NEW migration that INSERTs or ALTER CONSTRAINT to add only the new value(s)
 */

/* CHECK Constraint Values (require schema migration to modify) */

export const DEGREE_LEVELS = ['bachelors', 'masters', 'phd'] as const
export type DegreeLevel = typeof DEGREE_LEVELS[number]

export const GENDERS = ['male', 'female'] as const
export type Gender = typeof GENDERS[number]

export const CLASS_SECTIONS = ['A', 'B'] as const
export type ClassSection = typeof CLASS_SECTIONS[number]

export const POST_PRIORITIES = ['normal', 'important', 'urgent'] as const
export type PostPriority = typeof POST_PRIORITIES[number]

export const MEMBERSHIP_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const
export type MembershipRequestStatus = typeof MEMBERSHIP_REQUEST_STATUSES[number]

export const NOTIFICATION_SCOPES = ['server', 'channel'] as const
export type NotificationScope = typeof NOTIFICATION_SCOPES[number]

/* Lookup Table Values (Extend via INSERT migrations) */

export const USER_TYPES = ['student', 'teacher', 'staff'] as const
export type UserTypeValue = typeof USER_TYPES[number]

export const SERVER_TYPES = ['department', 'class', 'society'] as const
export type ServerTypeValue = typeof SERVER_TYPES[number]

export const CHANNEL_TYPES = ['announcements', 'program', 'course', 'general'] as const
export type ChannelTypeValue = typeof CHANNEL_TYPES[number]

export const POST_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
] as const
export type PostAttachmentTypeValue = typeof POST_ATTACHMENT_TYPES[number]

export const USER_ROLES = ['server_moderator', 'channel_moderator'] as const
export type UserRoleValue = typeof USER_ROLES[number]

export const NOTIFICATION_TYPES = [
  'role_assigned',
  'role_revoked',
  'post_created',
  'post_pinned',
  'membership_request_approved',
  'membership_request_rejected',
] as const
export type NotificationTypeValue = typeof NOTIFICATION_TYPES[number]

/* Size values for varchar columns */

export const departmentsVarcharSizes = {
  name: 100,
  code: 20,
} as const

export const disciplinesVarcharSizes = {
  value: 50,
  label: 100,
}

export const programsVarcharSizes = {
  discipline: 50,
  // degreeLevel: 50, already protected by CHECK constraint
  code: 20,
} as const

/* Values are fixed. Already seeded in the lookup table */
// export const userTypesVarcharSizes = {
//   value: 50,
//   label: 100,
//   description: 500,
// } as const

export const usersVarcharSizes = {
  fullName: 100,
  personalEmail: 255,
  universityEmail: 255,
  phone: 20,
  passwordHash: 255,
  // gender: 10, already protected by CHECK constraint
  bio: 1000,
} as const

export const userTypeAssignmentsVarcharSizes = {
  // type: 50, already protected by CHECK constraint on 'value' in userTypes.
} as const

export const studentsVarcharSizes = {
  rollNumber: 100,
} as const

export const designationsVarcharSizes = {
  value: 50,
  label: 100,
  description: 500,
} as const

export const teachersVarcharSizes = {
  designation: 50,
} as const

export const classesVarcharSizes = {
  // section: 1, already protected by CHECK constraint
} as const

export const societiesVarcharSizes = {
  name: 100,
  description: 1000,
} as const

/* Values are fixed. Already seeded in the lookup table */
// export const serverTypesVarcharSizes = {
//   value: 50
//   label: 100,
//   description: 500,
// }

export const serversVarcharSizes = {
  name: 100,
  description: 1000,
  // type: 50, already seeded in the lookup table
} as const

/* Values are fixed. Already seeded in the lookup table */
// export const channelTypesVarcharSizes = {
//   value: 50
//   label: 100,
//   description: 500,
// }

export const channelsVarcharSizes = {
  name: 100,
  description: 200,
  // type: 50, already seeded in the lookup table
} as const

export const societyMembershipRequestsVarcharSizes = {
  // status: 30, already protected by CHECK constraint
} as const

export const coursesVarcharSizes = {
  title: 100,
  code: 50,
} as const

export const postsVarcharSizes = {
  title: 100,
  // priority: 50, already protected by CHECK constraint
} as const

/* Values are fixed. Already seeded in the lookup table */
// export const postAttachmentTypesVarcharSizes = {
//   value: 150,
//   label: 100
// } as const

/* Values are fixed. Already seeded in the lookup table */
// export const postAttachmentsVarcharSizes = {
//   type: 150
// } as const

/* Values are fixed. Already seeded in the lookup table */
// export const userRolesVarcharSizes = {
//   value: 50,
//   label: 100,
//   description: 500,
// } as const

export const userRolePermissionsVarcharSizes = {
  role: 50,
} as const

export const userRoleAssignmentsVarcharSizes = {
  role: 50,
} as const

/* Values are fixed. Already seeded in the lookup table */
// export const notificationTypesVarcharSizes = {
//   value: 50,
//   label: 100,
// } as const

export const notificationsVarcharSizes = {
  title: 100,
  message: 300,
  type: 50,
} as const

export const notificationPreferencesVarcharSizes = {
  // scope: 20, already protected by CHECK constraint
} as const

export const refreshTokensVarcharSizes = {
  tokenHash: 255,
} as const