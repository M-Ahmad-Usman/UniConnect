import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { env } from '../config/env.js'
import type { Database } from './types.js'

// Export the pool to listen to its events and test connectivity
export const pool = new Pool({
  database: env.POSTGRES_DB,
  host: env.HOST,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  port: env.DB_PORT,
  max: 10,
})

const dialect = new PostgresDialect({
  pool,
})

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
})

// Force the pool to acquire a real connection and run a no-op query.
// This will throw if Postgres is unreachable, credentials are wrong, etc.
export const verifyConnection = async (): Promise<void> => {
  const client = await pool.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
}