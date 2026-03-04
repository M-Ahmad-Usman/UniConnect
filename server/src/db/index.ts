import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { env } from '../config/env.js'
import type { Database } from './types.js'

const dialect = new PostgresDialect({
  pool: new Pool({
    database: env.POSTGRES_DB,
    host: env.HOST,
    user: env.POSTGRES_USER,
    port: env.DB_PORT,
    max: 10,
  }),
})

export const db = new Kysely<Database>({ dialect, plugins: [new CamelCasePlugin()] })