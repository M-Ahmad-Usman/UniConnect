/**
 * Database constants and derived types.
 *
 * This file is the SINGLE SOURCE OF TRUTH for:
 * - CHECK constraint values (Gender, ClassSection, etc.)
 * - Lookup table values for application layer use
 *
 * IMPORTANT: Migrations do NOT import from this file.
 * Each migration contains its own hardcoded data to ensure determinism.
 * When adding new values (lookup or static CHECK lists):
 * 1. Add here (for TypeScript types + app layer)
 * 2. Write a NEW migration that INSERTs or ALTER CONSTRAINT to add only the new value(s)
 */

// CHECK Constraint Values (require schema migration to modify)

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

// Lookup Table Values (Extend via INSERT migrations)

export const DISCIPLINES = [
  'computer_science',
  'software_engineering',
  'artificial_intelligence',
  'computer_engineering',
] as const
export type DisciplineValue = typeof DISCIPLINES[number]

export const DEGREE_LEVELS = ['bachelors', 'masters', 'phd'] as const
export type DegreeLevelValue = typeof DEGREE_LEVELS[number]

export const USER_TYPES = ['student', 'teacher', 'admin'] as const
export type UserTypeValue = typeof USER_TYPES[number]

export const DESIGNATIONS = [
  'lab_incharge',
  'lecturer',
  'assistant_professor',
  'associate_professor',
  'professor',
] as const
export type DesignationValue = typeof DESIGNATIONS[number]

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

export const NOTIFICATION_TYPES = [
  'role_assigned',
  'role_revoked',
  'post_created',
  'post_pinned',
  'membership_request_approved',
  'membership_request_rejected',
] as const
export type NotificationTypeValue = typeof NOTIFICATION_TYPES[number]
