import { beforeEach, afterAll } from 'vitest'
import { sql } from 'kysely'
import { db } from '../db/index.js'

const LOOKUP_TABLES = new Set([
  'disciplines',
  'user_types',
  'designations',
  'server_types',
  'channel_types',
  'post_attachment_types',
  'notification_types',
])

const MIGRATION_TABLES = new Set(['kysely_migration', 'kysely_migration_lock'])

async function truncateTransactionalTables(): Promise<void> {
  const tables = await db.introspection.getTables()

  const tableNames = tables
    .map((t) => t.name)
    .filter((name) => !LOOKUP_TABLES.has(name) && !MIGRATION_TABLES.has(name))

  if (tableNames.length === 0) return

  const tablesToTruncate = tableNames.map((name) => `"${name}"`).join(', ')
  await sql.raw(`TRUNCATE TABLE ${tablesToTruncate} RESTART IDENTITY CASCADE`).execute(db)
}

beforeEach(async () => { await truncateTransactionalTables() })

afterAll(async () => { await db.destroy() })