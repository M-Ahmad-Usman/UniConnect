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

interface SeededUserRow {
  id: number;
  email: string;
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

async function findUserIdByEmail(pool: Pool, email: string) {
  const result = await pool.query<SeededUserRow>('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [
    email,
  ]);

  return result.rows[0]?.id ?? null;
}

async function seedModule2Data(pool: Pool) {
  const shellUserId = await findUserIdByEmail(pool, e2eUsers.moduleShell.email);
  const notificationUserId = await findUserIdByEmail(pool, e2eUsers.moduleNotifications.email);

  if (!shellUserId || !notificationUserId) {
    throw new Error('Module 2 E2E users were not created before seeding runtime data.');
  }

  const shellServerResult = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, $3::server_type, $4, NOW())
      RETURNING id
    `,
    ['Computer Science Hub', 'Department-wide communication and announcements.', 'Department', shellUserId],
  );
  const shellServerId = shellServerResult.rows[0]?.id;

  const notificationServerResult = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, $3::server_type, $4, NOW())
      RETURNING id
    `,
    ['Realtime Updates Hub', 'Notifications-focused runtime workspace.', 'Department', notificationUserId],
  );
  const notificationServerId = notificationServerResult.rows[0]?.id;

  if (!shellServerId || !notificationServerId) {
    throw new Error('Module 2 E2E servers could not be created.');
  }

  await pool.query(
    `
      INSERT INTO server_memberships (user_id, server_id, is_auto_joined)
      VALUES
        ($1, $2, false),
        ($3, $4, false)
    `,
    [shellUserId, shellServerId, notificationUserId, notificationServerId],
  );

  const shellAnnouncementChannelResult = await pool.query<{ id: number }>(
    `
      INSERT INTO channels (server_id, name, description, type, is_auto_created, created_by, created_at)
      VALUES ($1, $2, $3, $4::channel_type, $5, $6, NOW())
      RETURNING id
    `,
    [
      shellServerId,
      'announcements',
      'Primary announcement stream for the department.',
      'announcement',
      true,
      shellUserId,
    ],
  );
  const shellGeneralChannelResult = await pool.query<{ id: number }>(
    `
      INSERT INTO channels (server_id, name, description, type, is_auto_created, created_by, created_at)
      VALUES ($1, $2, $3, $4::channel_type, $5, $6, NOW())
      RETURNING id
    `,
    [
      shellServerId,
      'general',
      'General department discussion and updates.',
      'general',
      true,
      shellUserId,
    ],
  );
  await pool.query(
    `
      INSERT INTO channels (
        server_id,
        name,
        description,
        type,
        is_locked,
        is_auto_created,
        created_by,
        created_at
      )
      VALUES ($1, $2, $3, $4::channel_type, $5, $6, $7, NOW())
    `,
    [
      shellServerId,
      'cs-401',
      'Locked course channel for semester-specific announcements.',
      'course',
      true,
      false,
      shellUserId,
    ],
  );

  const notificationChannelResult = await pool.query<{ id: number }>(
    `
      INSERT INTO channels (server_id, name, description, type, is_auto_created, created_by, created_at)
      VALUES ($1, $2, $3, $4::channel_type, $5, $6, NOW())
      RETURNING id
    `,
    [
      notificationServerId,
      'updates',
      'Notification-driven updates channel.',
      'announcement',
      true,
      notificationUserId,
    ],
  );

  const shellAnnouncementChannelId = shellAnnouncementChannelResult.rows[0]?.id;
  const shellGeneralChannelId = shellGeneralChannelResult.rows[0]?.id;
  const notificationChannelId = notificationChannelResult.rows[0]?.id;

  if (!shellAnnouncementChannelId || !shellGeneralChannelId || !notificationChannelId) {
    throw new Error('Module 2 E2E channels could not be created.');
  }

  await pool.query(
    `
      INSERT INTO posts (author_id, channel_id, title, content, priority, created_at)
      VALUES
        ($1, $2, $3, $4, $5::post_priority, NOW() - INTERVAL '10 minutes'),
        ($1, $2, $6, $7, $5::post_priority, NOW() - INTERVAL '5 minutes'),
        ($1, $8, $9, $10, $5::post_priority, NOW() - INTERVAL '3 minutes')
    `,
    [
      shellUserId,
      shellAnnouncementChannelId,
      'Module 2 Runtime Update',
      'This post confirms the search-aware feed preview is wired for runtime validation.',
      'normal',
      'Searchable Architecture Notes',
      'This post exists so Playwright can verify channel-scoped title search and URL sync.',
      shellGeneralChannelId,
      'General Discussion Thread',
      'A general-purpose post that should not appear in announcement-channel search results.',
    ],
  );

  const notificationPostResult = await pool.query<{ id: number }>(
    `
      INSERT INTO posts (author_id, channel_id, title, content, priority, created_at)
      VALUES ($1, $2, $3, $4, $5::post_priority, NOW() - INTERVAL '2 minutes')
      RETURNING id
    `,
    [
      notificationUserId,
      notificationChannelId,
      'Realtime Notification Drill',
      'Used to verify the notification preview and channel navigation runtime flow.',
      'normal',
    ],
  );
  const notificationPostId = notificationPostResult.rows[0]?.id;

  if (!notificationPostId) {
    throw new Error('Module 2 E2E notification post could not be created.');
  }

  await pool.query(
    `
      INSERT INTO notifications (user_id, post_id, type, title, message, read_at, created_at)
      VALUES
        ($1, $2, $3::notification_type, $4, $5, NULL, NOW() - INTERVAL '1 minute'),
        ($1, NULL, $6::notification_type, $7, $8, NULL, NOW() - INTERVAL '30 seconds')
    `,
    [
      notificationUserId,
      notificationPostId,
      'new_post',
      'Realtime Notification Drill',
      'A new post is waiting in #updates.',
      'role_assigned',
      'Role assignment updated',
      'Your permissions were refreshed for testing the preview dropdown.',
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

    await seedModule2Data(pool);
  } finally {
    await pool.end();
  }
}