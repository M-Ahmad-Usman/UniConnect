import * as path from 'path'
import { Pool } from 'pg'
import { promises as fs } from 'fs'
import { z } from 'zod'
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
} from 'kysely'
import type {
  MigrationResult,
  MigrationResultSet,
  MigrationInfo,
} from 'kysely'

import { env } from '../config/env.js'
import type { Database } from './types.js'

// Constants

const USAGE = `
USAGE: tsx migrator.ts create <migration_name>
       tsx migrator.ts get:migrations
       tsx migrator.ts up
       tsx migrator.ts down
       tsx migrator.ts latest`

const COMMAND_SCHEMA = z.enum(['up', 'down', 'latest', 'create', 'get:migrations'])

const MIGRATION_DIRECTORY = path.join(import.meta.dirname, './migrations')

const MIGRATION_FILE_TEMPLATE = `import type { Kysely } from 'kysely'

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function up(db: Kysely<any>): Promise<void> {
  
}

export async function down(db: Kysely<any>): Promise<void> {
  
}`

// Types

interface CreateCommand {
  type: 'create'
  migrationName: string
}

interface DbCommand {
  type: 'up' | 'down' | 'latest' | 'get:migrations'
}

type Command = CreateCommand | DbCommand

// Entry Point

async function main(): Promise<void> {
  const command = parseCommand()

  if (command.type === 'create') {
    await runCreateCommand(command.migrationName)
    return
  }

  await runDatabaseCommand(command.type)
}

main().catch((error: unknown) => {
  console.error(`\n❌ Fatal error: ${toMessage(error)}`)
  process.exit(1)
})

// Command Runners

async function runCreateCommand(migrationName: string): Promise<void> {
  await createMigrationFile(migrationName)
  console.log(`✅ Migration "${migrationName}" created successfully.`)
}

async function runDatabaseCommand(command: DbCommand['type']): Promise<void> {
  const { db, migrator } = createMigratorInstance()

  try {
    const success = await executeMigration(migrator, command)
    if (!success) {
      throw new Error('One or more migrations failed. See output above for details.')
    }
  } finally {
    // Always release the connection pool, even if an error was thrown above
    await db.destroy()
  }
}

// Argument Parsing

/**
 * Parses and validates CLI arguments into a typed Command.
 * Throws with a usage message if the arguments are invalid.
 */
function parseCommand(): Command {
  const verbResult = COMMAND_SCHEMA.safeParse(process.argv[2])

  if (!verbResult.success) {
    throw new Error(`Invalid command.\n${USAGE}`)
  }

  if (verbResult.data === 'create') {
    const migrationName = process.argv[3]?.trim()
    if (!migrationName) {
      throw new Error(`Migration name is required.\n${USAGE}`)
    }
    return { type: 'create', migrationName }
  }

  return { type: verbResult.data }
}

// Migration Execution

async function executeMigration(migrator: Migrator, command: DbCommand['type']): Promise<boolean> {
  switch (command) {
    case 'up':
      return handleResults(await migrator.migrateUp())
    case 'down':
      return handleResults(await migrator.migrateDown())
    case 'latest':
      return handleResults(await migrator.migrateToLatest())
    case 'get:migrations':
      logMigrations(await migrator.getMigrations())
      return true
  }
}

// Environment Setup

function createMigratorInstance(): { db: Kysely<Database>; migrator: Migrator } {
  const dialect = new PostgresDialect({
    pool: new Pool({
      database: env.POSTGRES_DB,
      host: env.HOST,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      port: env.DB_PORT,
    }),
  })

  const db = new Kysely<Database>({ dialect })
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: MIGRATION_DIRECTORY,
    }),
  })

  return { db, migrator }
}

// File Creation

/**
 * Creates a timestamped migration file in the migrations directory.
 * Throws if the file cannot be written.
 */
async function createMigrationFile(migrationName: string): Promise<void> {
  // Replace ':' with '-' for cross-platform support (Windows disallows colons in filenames)
  const timestamp = new Date().toISOString().replace(/:/g, '-')
  const filePath = path.join(MIGRATION_DIRECTORY, `${timestamp}_${migrationName}.ts`)

  try {
    await fs.writeFile(filePath, MIGRATION_FILE_TEMPLATE)
  } catch (error: unknown) {
    throw new Error(`Failed to create migration file "${migrationName}"`, { cause: error })
  }
}

// Result Logging

/**
 * Logs each migration result and returns false if any error occurred.
 *
 * The `results` array from Kysely follows these rules:
 *   - All successful migrations have status 'Success'.
 *   - The first failed migration has status 'Error'; all subsequent ones are 'NotExecuted'.
 *   - `results` is undefined if an error occurred before Kysely could determine which
 *     migrations to run.
 *   - An empty array means there were no pending migrations.
 */
function handleResults(migrationResultSet: MigrationResultSet): boolean {
  const { error, results } = migrationResultSet

  if (results && results.length > 0) {
    results.forEach((migration: MigrationResult) => {
      if (migration.status === 'Success') {
        console.log(`✅ ${migration.direction}: ${migration.migrationName}`)
      } else if (migration.status === 'Error') {
        console.error(`❌ Failed: ${migration.migrationName}`)
      } else {
        console.log(`⏭️  Skipped: ${migration.migrationName}`)
      }
    })
  } else {
    console.log('✅ No migrations to run.')
  }

  if (error) {
    console.error('\n❌ Migration error details:')
    console.error(error)
    return false
  }

  return true
}

function logMigrations(migrationInfo: readonly MigrationInfo[]): void {
  const formatted = migrationInfo.map((mi) => ({
    // Strip the ISO timestamp prefix from the migration name for readability
    name: mi.name.replace(/20.*Z_/, ''),
    executedAt: mi.executedAt ?? 'not executed yet',
  }))

  console.info(formatted)
}

// Utilities

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}