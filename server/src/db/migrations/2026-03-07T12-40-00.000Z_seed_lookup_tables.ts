/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Kysely } from 'kysely'
import { TABLE_NAMES } from './2026-03-07T02-23-50.616Z_create_tables.js'

/**
 * Seeds lookup tables with initial values.
 *
 * IMPORTANT: This data is hardcoded here intentionally.
 * Migrations must be immutable snapshots - they should NOT import from
 * evolving files like constants.ts to ensure deterministic results.
 *
 * To add new lookup values in the future:
 * 1. Add to constants.ts (for TypeScript types + app layer)
 * 2. Write a NEW migration that INSERTs only the new value(s)
 */

export async function up(db: Kysely<any>): Promise<void> {
  for (const [camelCasedTableName, seedDataRows] of Object.entries(LOOKUP_DATA)) {
    const snakeCasedTableName = TABLE_NAMES[camelCasedTableName as keyof typeof TABLE_NAMES]

    await db.insertInto(snakeCasedTableName).values(seedDataRows).execute()
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  for (const camelCasedTableName of Object.keys(LOOKUP_DATA).reverse()) {
    const snakeCasedTableName = TABLE_NAMES[camelCasedTableName as keyof typeof TABLE_NAMES]

    await db.deleteFrom(snakeCasedTableName).execute()
  }
}

const FIVE_MB = 5_242_880
const TEN_MB = 10_485_760

const LOOKUP_DATA = {
  disciplines: [
    { value: 'computer_science', label: 'Computer Science' },
    { value: 'software_engineering', label: 'Software Engineering' },
    { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
    { value: 'computer_engineering', label: 'Computer Engineering' },
  ],
  userTypes: [
    { value: 'student', label: 'Student', description: 'Enrolled student' },
    { value: 'teacher', label: 'Teacher', description: 'Faculty member' },
    { value: 'admin', label: 'Admin', description: 'System administrator' },
  ],
  designations: [
    { value: 'lab_incharge', label: 'Lab Incharge', description: 'Responsible for managing laboratory facilities and assisting students during practical sessions.' },
    { value: 'lecturer', label: 'Lecturer', description: 'Entry-level academic faculty focused on teaching undergraduate courses.' },
    { value: 'assistant_professor', label: 'Assistant Professor', description: 'Mid-level rank involving teaching, curriculum development, and research.' },
    { value: 'associate_professor', label: 'Associate Professor', description: 'Senior rank with proven teaching excellence and research publications.' },
    { value: 'professor', label: 'Professor', description: 'Highest academic rank for distinguished contributions to teaching and research.' },
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
    { value: 'role_assigned', label: 'New role assignment' },
    { value: 'role_revoked', label: 'Role revoked' },
    { value: 'post_created', label: 'New post created' },
    { value: 'post_pinned', label: 'Post pinned' },
    { value: 'membership_request_approved', label: 'Membership request approved' },
    { value: 'membership_request_rejected', label: 'Membership request rejected' },
  ],
}