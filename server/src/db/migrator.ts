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
} from 'kysely'

import { env } from '../config/env.js'
import type { Database } from './types.js'

const USAGE = `
USAGE: tsx migrator.ts create <migration_name>
tsx migrator.ts up
tsx migrator.ts down
tsx migrator.ts latest`

// Allowed Command Line arguments for argv[2]
const ARGUMENT_SCHEMA = z.enum(['up', 'down', 'latest', 'create'])
const MIGRATION_DIRECTORY = path.join(import.meta.dirname, './migrations')

const migrationFileContentTemplate =`import type { Kysely } from 'kysely'
import { sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  
}`

function setupEnvironment(): { db: Kysely<Database>, migrator: Migrator } {

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

  return {
    db,
    migrator,
  }
}

// Creates Migration File of supplied name. Handles error and exits the process gracefully
async function createMigrationFile(migrationFileName: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const migrationFilePath = path.join(MIGRATION_DIRECTORY, `${timestamp}_${migrationFileName}.ts`)

  try {
    await fs.writeFile(migrationFilePath, migrationFileContentTemplate)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to create migration ${migrationFileName}\nError: ${errorMessage}`)
    process.exit(1)
  }
}

async function main(): Promise<void> {

  const argumentResult = ARGUMENT_SCHEMA.safeParse(process.argv[2])

  if (!argumentResult.success) {
    console.error(USAGE)
    process.exit(1)
  }

  const argument = argumentResult.data

  if (argument === 'create') {

    const migrationNameArgumentResult = z.string().safeParse(process.argv[3])

    if (!migrationNameArgumentResult.success) {
      console.error(USAGE)
      process.exit(1)
    }

    const migrationNameArgument = migrationNameArgumentResult.data

    await createMigrationFile(migrationNameArgument)
    console.log(`Migration ${migrationNameArgument} created successfuly.`)
    return
  }

  const { db, migrator } = setupEnvironment()

  let areMigrationsSuccessful: boolean

  switch (argument) {
    case 'up':
      areMigrationsSuccessful = handleResults(await migrator.migrateUp())
      break
    case 'down':
      areMigrationsSuccessful = handleResults(await migrator.migrateDown())
      break
    case 'latest':
      areMigrationsSuccessful = handleResults(await migrator.migrateToLatest())
      break
  }

  await db.destroy()
  if (areMigrationsSuccessful) {
    process.exit(1)
  }

}

// Logs the results and returns boolean to signal whether any error has occurred or not
function handleResults(migrationResultSet: MigrationResultSet): boolean {

  const { error, results } = migrationResultSet

  /* results property:
      - If all went well, each result's status is Success.
      - If some migration failed, the failed migration's result's status is Error and all results after that one have status ´NotExecuted`.
      - This property can be undefined if an error occurred before Kysely was able to figure out which migrations should be executed.
      - If this list is empty, there were no migrations to execute.
  */

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
    console.log('✅ No migrations to run')
  }

  if (error) {
    console.error('\n❌ Migration failed:')
    console.error(error)
    return false
  }

  return true
}

main().catch((e: unknown) => {
  const errorMessage = e instanceof Error ? e.message : String(e)
  console.error(`Fatal error: ${errorMessage}`)
  process.exit(1)
})