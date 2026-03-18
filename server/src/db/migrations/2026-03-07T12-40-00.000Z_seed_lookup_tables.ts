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

// Types & Constants

const FIVE_MB = 5_242_880
const TEN_MB = 10_485_760

interface LookupRow {
  value: string
  label: string
  description?: string
  max_size_bytes?: number
}

type TableSeedData = Partial<Record<keyof typeof TABLE_NAMES, LookupRow[]>>

// Single Source of Truth for Lookup Data

const LOOKUP_DATA: TableSeedData = {
  disciplines: [
    { value: 'CS', label: 'Computer Science' },
    { value: 'SE', label: 'Software Engineering' },
    { value: 'AI', label: 'Artificial Intelligence' },
    { value: 'CE', label: 'Computer Engineering' },
  ],
  degreeLevels: [
    { value: 'BS', label: 'Bachelors' },
    { value: 'MS', label: 'Masters' },
    { value: 'PHD', label: 'PhD' },
  ],
  userTypes: [
    { value: 'STU', label: 'Student', description: 'Enrolled student' },
    { value: 'TCH', label: 'Teacher', description: 'Faculty member' },
    { value: 'ADM', label: 'Admin', description: 'System administrator' },
  ],
  designations: [
    {
      value: 'LI',
      label: 'Lab Incharge',
      description: 'Responsible for managing laboratory facilities, maintaining technical equipment, and assisting students during practical sessions.',
    },
    {
      value: 'LEC',
      label: 'Lecturer',
      description: 'An entry-level academic faculty member focused primarily on teaching undergraduate courses and assisting with departmental administration.',
    },
    {
      value: 'AP',
      label: 'Assistant Professor',
      description: 'A mid-level academic rank involving independent teaching, curriculum development, and active research.',
    },
    {
      value: 'ASSOC_P',
      label: 'Associate Professor',
      description: 'A senior academic rank denoting a significant and proven record of teaching excellence, research publications, and university service.',
    },
    {
      value: 'PROF',
      label: 'Professor',
      description: 'The highest standard academic rank, awarded for distinguished, sustained contributions to teaching, research, and academic leadership.',
    },
  ],
  serverTypes: [
    { value: 'CLASS', label: 'Class Server', description: 'Server for a class cohort' },
    { value: 'SOC', label: 'Society Server', description: 'Server for a student society' },
    { value: 'DEPT', label: 'Department Server', description: 'Server for a department' },
  ],
  channelTypes: [
    { value: 'ANN', label: 'Announcements', description: 'One-way broadcast channel' },
    { value: 'PROG', label: 'Program', description: 'Program-specific discussion' },
    { value: 'CRS', label: 'Course', description: 'Course-specific discussion' },
    { value: 'GEN', label: 'General', description: 'General discussion' },
  ],
  fileAttachmentTypes: [
    { value: 'image/jpeg', label: 'JPEG Image', max_size_bytes: FIVE_MB },
    { value: 'image/jpg', label: 'JPG Image', max_size_bytes: FIVE_MB },
    { value: 'image/png', label: 'PNG Image', max_size_bytes: FIVE_MB },
    { value: 'image/webp', label: 'WebP Image', max_size_bytes: FIVE_MB },
    { value: 'application/pdf', label: 'PDF Document', max_size_bytes: TEN_MB },
    { value: 'application/msword', label: 'Word Document', max_size_bytes: FIVE_MB },
  ],
} as const satisfies TableSeedData