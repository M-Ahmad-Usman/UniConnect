import { execFile } from 'child_process'
import { promisify } from 'util'
import { Pool } from 'pg'
import { env } from '../config/env.js'

const execFileAsync = promisify(execFile)

export async function setup(): Promise<void> {
  await ensureTestDatabaseExists()
  await runMigrations()
}

export async function teardown(): Promise<void> {
  // Intentionally empty: the test DB persists between runs.
  // setup.ts truncates transactional tables before each test.
}

// Connects to Postgres's default maintenance DB ('postgres') because
// testing database may not exist yet
async function ensureTestDatabaseExists(): Promise<void> {
  const adminPool = new Pool({
    host: env.HOST,
    port: env.DB_PORT,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: 'postgres',
  })

  try {
    const result = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [env.POSTGRES_DB],
    )

    if (result.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${env.POSTGRES_DB}"`)
      console.log(`✅ Created test database "${env.POSTGRES_DB}"`)
    }
  } finally {
    await adminPool.end()
  }
}

// Run migrations using tsx to prevent node's native ESM
// module resolution errors between .ts and .js
async function runMigrations(): Promise<void> {
  try {
    const { stdout, stderr } = await execFileAsync(
      'npx',
      ['tsx', 'src/db/migrator.ts', 'latest'],
      { env: process.env },
    )

    console.log(stdout)
    if (stderr) console.error(stderr)
  } catch (error) {
    console.error('❌ Test DB migration failed:', error)
    throw error
  }
}