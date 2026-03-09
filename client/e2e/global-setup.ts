import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import { createDbPool } from './helpers/db';
import { e2eUsers } from './helpers/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../..');
const serverDir = path.resolve(workspaceRoot, 'server');
const migrationsDir = path.resolve(serverDir, 'prisma/migrations');

interface SeedUser {
  email: string;
  password: string;
  fullName: string;
  mustChangePassword: boolean;
}

async function applyMigrations(pool: Pool) {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const migrationNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  await pool.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
    GRANT ALL ON SCHEMA public TO CURRENT_USER;
  `);

  for (const migrationName of migrationNames) {
    const migrationPath = path.resolve(migrationsDir, migrationName, 'migration.sql');
    const migrationSql = await readFile(migrationPath, 'utf8');
    await pool.query(migrationSql);
  }
}

async function createUser(pool: Pool, user: SeedUser) {
  const passwordHash = await bcrypt.hash(user.password, 12);

  await pool.query(
    `
      INSERT INTO users (
        full_name,
        email,
        phone,
        password_hash,
        gender,
        user_type,
        is_active,
        must_change_password,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5::gender, $6::user_type, $7, $8, NOW(), NOW())
    `,
    [
      user.fullName,
      user.email,
      '03000000000',
      passwordHash,
      'male',
      'Student',
      true,
      user.mustChangePassword,
    ],
  );
}

export default async function globalSetup() {
  const pool = createDbPool();

  try {
    await applyMigrations(pool);

    for (const user of Object.values(e2eUsers)) {
      await createUser(pool, user);
    }
  } finally {
    await pool.end();
  }
}