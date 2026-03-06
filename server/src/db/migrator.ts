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

import type { Database } from './types.js'
import { env } from '../config/env.js'

async function main() {

  const command = z.enum(['up', 'down', 'latest']).parse(process.argv[2])

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
      migrationFolder: path.join(import.meta.dirname, './migrations'),
    }),
  })

  switch (command) {
    case 'up':
      handleResults(await migrator.migrateUp())
      break
    case 'down':
      handleResults(await migrator.migrateDown())
      break
    case 'latest':
      handleResults(await migrator.migrateToLatest())
  }

  return db
}

function handleResults(migrationResultSet: MigrationResultSet): void {

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
    process.exit(1)
  }

  console.log('\n✅ Migration completed successfully')
}

main()
  .then(async db => await db.destroy())
  .catch((e: unknown) => console.log(e))