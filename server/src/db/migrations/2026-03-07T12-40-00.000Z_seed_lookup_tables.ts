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

const FIVE_MB = 5_242_880
const TEN_MB = 10_485_760

export async function up(db: Kysely<any>): Promise<void> {
  await seedDisciplines(db)
  await seedUserTypes(db)
  await seedDesignations(db)
  await seedServerTypes(db)
  await seedChannelTypes(db)
  await seedPostAttachmentTypes(db)
  await seedNotificationTypes(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  // Delete in reverse order to avoid any potential FK issues
  await clearNotificationTypes(db)
  await clearPostAttachmentTypes(db)
  await clearChannelTypes(db)
  await clearServerTypes(db)
  await clearDesignations(db)
  await clearUserTypes(db)
  await clearDisciplines(db)
}

// Seed Functions

async function seedDisciplines(db: Kysely<any>): Promise<void> {
  await db
    .insertInto(TABLE_NAMES.disciplines)
    .values([
      { value: 'computer_science', label: 'Computer Science' },
      { value: 'software_engineering', label: 'Software Engineering' },
      { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
      { value: 'computer_engineering', label: 'Computer Engineering' },
    ])
    .execute()
}

async function seedUserTypes(db: Kysely<any>): Promise<void> {
  await db
    .insertInto(TABLE_NAMES.userTypes)
    .values([
      { value: 'student', label: 'Student', description: 'Enrolled student' },
      { value: 'teacher', label: 'Teacher', description: 'Faculty member' },
      { value: 'admin', label: 'Admin', description: 'System administrator' },
    ])
    .execute()
}

async function seedDesignations(db: Kysely<any>): Promise<void> {
  await db
    .insertInto(TABLE_NAMES.designations)
    .values([
      {
        value: 'lab_incharge',
        label: 'Lab Incharge',
        description:
          'Responsible for managing laboratory facilities and assisting students during practical sessions.',
      },
      {
        value: 'lecturer',
        label: 'Lecturer',
        description:
          'Entry-level academic faculty focused on teaching undergraduate courses.',
      },
      {
        value: 'assistant_professor',
        label: 'Assistant Professor',
        description:
          'Mid-level rank involving teaching, curriculum development, and research.',
      },
      {
        value: 'associate_professor',
        label: 'Associate Professor',
        description:
          'Senior rank with proven teaching excellence and research publications.',
      },
      {
        value: 'professor',
        label: 'Professor',
        description:
          'Highest academic rank for distinguished contributions to teaching and research.',
      },
    ])
    .execute()
}

async function seedServerTypes(db: Kysely<any>): Promise<void> {
  await db
    .insertInto(TABLE_NAMES.serverTypes)
    .values([
      {
        value: 'department',
        label: 'Department Server',
        description: 'Server for a department',
      },
      {
        value: 'class',
        label: 'Class Server',
        description: 'Server for a class cohort',
      },
      {
        value: 'society',
        label: 'Society Server',
        description: 'Server for a student society',
      },
    ])
    .execute()
}

async function seedChannelTypes(db: Kysely<any>): Promise<void> {
  await db
    .insertInto(TABLE_NAMES.channelTypes)
    .values([
      {
        value: 'announcements',
        label: 'Announcements',
        description: 'One-way broadcast channel',
      },
      {
        value: 'program',
        label: 'Program',
        description: 'Program-specific discussion',
      },
      {
        value: 'course',
        label: 'Course',
        description: 'Course-specific discussion',
      },
      {
        value: 'general',
        label: 'General',
        description: 'General discussion',
      },
    ])
    .execute()
}

async function seedPostAttachmentTypes(db: Kysely<any>): Promise<void> {
  await db
    .insertInto(TABLE_NAMES.postAttachmentTypes)
    .values([
      { value: 'image/jpeg', max_size_bytes: FIVE_MB, label: 'JPEG Image' },
      { value: 'image/jpg', max_size_bytes: FIVE_MB, label: 'JPG Image' },
      { value: 'image/png', max_size_bytes: FIVE_MB, label: 'PNG Image' },
      { value: 'image/webp', max_size_bytes: FIVE_MB, label: 'WebP Image' },
      { value: 'application/pdf', max_size_bytes: TEN_MB, label: 'PDF Document' },
      { value: 'application/msword', max_size_bytes: FIVE_MB, label: 'Word Document' },
    ])
    .execute()
}

async function seedNotificationTypes(db: Kysely<any>): Promise<void> {
  await db
    .insertInto(TABLE_NAMES.notificationTypes)
    .values([
      { value: 'role_assigned', label: 'New role assignment' },
      { value: 'role_revoked', label: 'Role revoked' },
      { value: 'post_created', label: 'New post created' },
      { value: 'post_pinned', label: 'Post pinned' },
      {
        value: 'membership_request_approved',
        label: 'Membership request approved',
      },
      {
        value: 'membership_request_rejected',
        label: 'Membership request rejected',
      },
    ])
    .execute()
}

// Clear functions (for rollback)

async function clearDisciplines(db: Kysely<any>): Promise<void> {
  await db.deleteFrom(TABLE_NAMES.disciplines).execute()
}

async function clearUserTypes(db: Kysely<any>): Promise<void> {
  await db.deleteFrom(TABLE_NAMES.userTypes).execute()
}

async function clearDesignations(db: Kysely<any>): Promise<void> {
  await db.deleteFrom(TABLE_NAMES.designations).execute()
}

async function clearServerTypes(db: Kysely<any>): Promise<void> {
  await db.deleteFrom(TABLE_NAMES.serverTypes).execute()
}

async function clearChannelTypes(db: Kysely<any>): Promise<void> {
  await db.deleteFrom(TABLE_NAMES.channelTypes).execute()
}

async function clearPostAttachmentTypes(db: Kysely<any>): Promise<void> {
  await db.deleteFrom(TABLE_NAMES.postAttachmentTypes).execute()
}

async function clearNotificationTypes(db: Kysely<any>): Promise<void> {
  await db.deleteFrom(TABLE_NAMES.notificationTypes).execute()
}