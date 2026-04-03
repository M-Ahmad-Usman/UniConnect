/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Kysely } from 'kysely'
import { TABLE_NAMES } from '../types.js'

export async function up(db: Kysely<any>): Promise<void> {

  // Iterate through the single source of truth and dynamically insert rows
  for (const [camelCasedTableName, seedDataRows] of Object.entries(LOOKUP_DATA)) {
    const snakeCasedTableName = TABLE_NAMES[camelCasedTableName as keyof typeof TABLE_NAMES]

    await db.insertInto(snakeCasedTableName).values(seedDataRows).execute()
  }
}

export async function down(db: Kysely<any>): Promise<void> {

  // Delete in reverse order as a best practice, in case future lookups depend on each other
  for (const camelCasedTableName of Object.keys(LOOKUP_DATA).reverse()) {
    const snakeCasedTableName = TABLE_NAMES[camelCasedTableName as keyof typeof TABLE_NAMES]

    await db.deleteFrom(snakeCasedTableName).execute()
  }
}

// types & constants

const FIVE_MB = 5_242_880
const TEN_MB = 10_485_760

/**
 * These lookup tables works just as enum types.
 * They were converted into tables to follow scalable and extensible design.
 * The following values were decided during development and the system is built assuming these values exists.
 * If in future new values are entered then make sure that the application layer is aware of the new data.
 */
export const LOOKUP_DATA = {
  disciplines: [
    { value: 'computer_science', label: 'Computer Science' },
    { value: 'software_engineering', label: 'Software Engineering' },
    { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
    { value: 'computer_engineering', label: 'Computer Engineering' },
  ],
  degreeLevels: [
    { value: 'bachelors', label: 'Bachelors' },
    { value: 'masters', label: 'Masters' },
    { value: 'phd', label: 'PhD' },
  ],
  userTypes: [
    { value: 'student', label: 'Student', description: 'Enrolled student' },
    { value: 'teacher', label: 'Teacher', description: 'Faculty member' },
    { value: 'admin', label: 'Admin', description: 'System administrator' },
  ],
  designations: [
    {
      value: 'lab_incharge',
      label: 'Lab Incharge',
      description: 'Responsible for managing laboratory facilities, maintaining technical equipment, and assisting students during practical sessions.',
    },
    {
      value: 'lecturer',
      label: 'Lecturer',
      description: 'An entry-level academic faculty member focused primarily on teaching undergraduate courses and assisting with departmental administration.',
    },
    {
      value: 'assistant_professor',
      label: 'Assistant Professor',
      description: 'A mid-level academic rank involving independent teaching, curriculum development, and active research.',
    },
    {
      value: 'associate_professor',
      label: 'Associate Professor',
      description: 'A senior academic rank denoting a significant and proven record of teaching excellence, research publications, and university service.',
    },
    {
      value: 'professor',
      label: 'Professor',
      description: 'The highest standard academic rank, awarded for distinguished, sustained contributions to teaching, research, and academic leadership.',
    },
  ],
  serverTypes: [
    { value: 'department', label: 'Department Server', description: 'Server for a department' },
    { value: 'class', label: 'Class Server', description: 'Server for a class cohort' },
    { value: 'society', label: 'Society Server', description: 'Server for a student society' },
  ],
  channelTypes: [
    { value: 'announcements', label: 'Announcements', description: 'One-way broadcast channel' },
    { value: 'program', label: 'Program', description: 'Program-specific discussion' },
    { value: 'course', label: 'Course', description: 'Course-specific discussion' },
    { value: 'general', label: 'General', description: 'General discussion' },
  ],
  postAttachmentTypes: [
    { value: 'image/jpeg', max_size_bytes: FIVE_MB },
    { value: 'image/jpg', max_size_bytes: FIVE_MB },
    { value: 'image/png', max_size_bytes: FIVE_MB },
    { value: 'image/webp', max_size_bytes: FIVE_MB },
    { value: 'application/pdf', max_size_bytes: TEN_MB },
    { value: 'application/msword', max_size_bytes: FIVE_MB },
  ],
  notificationTypes: [
    { value: 'role_assigned', label: 'New role asignment' },
    { value: 'role_revoked', label: 'Role revoked' },
    { value: 'post_created', label: 'New post created' },
    { value: 'post_pinned', label: 'Post pinned' },
    { value: 'membership_request_approved', label: 'Memberhip request approved' },
    { value: 'membership_request_reject', label: 'Memberhip request rejected' },
  ],
} as const