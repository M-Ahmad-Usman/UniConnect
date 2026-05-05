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
  userType?: 'Teacher' | 'Student' | 'Admin';
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
      user.userType ?? 'Student',
      true,
      user.mustChangePassword,
    ],
  );
}

async function seedModule3Permissions(pool: Pool) {
  await pool.query(
    `
      INSERT INTO roles (name)
      VALUES ($1)
    `,
    ['hod'],
  );

  await pool.query(
    `
      INSERT INTO permissions (name)
      VALUES
        ($1),
        ($2),
        ($3)
    `,
    ['create:channel', 'lock:channel', 'delete:channel'],
  );

  await pool.query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = $1
    `,
    ['hod'],
  );
}

async function seedModule3Data(pool: Pool) {
  const managerUserId = await findUserIdByEmail(pool, e2eUsers.moduleManager.email);
  const viewerUserId = await findUserIdByEmail(pool, e2eUsers.moduleViewer.email);

  if (!managerUserId || !viewerUserId) {
    throw new Error('Module 3 E2E users were not created before seeding runtime data.');
  }

  const serverResult = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, $3::server_type, $4, NOW())
      RETURNING id
    `,
    [
      'Engineering Faculty Hub',
      'Module 3 fixture server for channel-management and member-list coverage.',
      'Department',
      managerUserId,
    ],
  );
  const module3ServerId = serverResult.rows[0]?.id;

  if (!module3ServerId) {
    throw new Error('Module 3 fixture server could not be created.');
  }

  await pool.query(
    `
      INSERT INTO teacher_info (teacher_id, designation)
      VALUES ($1, $2)
    `,
    [managerUserId, 'Assistant Professor'],
  );

  const departmentResult = await pool.query<{ id: number }>(
    `
      INSERT INTO departments (name, code, hod_id, server_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    ['E2E Engineering Department', 'E2E-ENG', managerUserId, module3ServerId],
  );
  const departmentId = departmentResult.rows[0]?.id;

  if (!departmentId) {
    throw new Error('Module 3 fixture department could not be created.');
  }

  await pool.query(
    `
      UPDATE users
      SET department_id = $2
      WHERE id = $1
    `,
    [managerUserId, departmentId],
  );

  await pool.query(
    `
      INSERT INTO server_memberships (user_id, server_id, is_auto_joined)
      VALUES
        ($1, $3, false),
        ($2, $3, false)
    `,
    [managerUserId, viewerUserId, module3ServerId],
  );

  const extraMembersResult = await pool.query<{ id: number }>(
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
        department_id,
        created_at,
        updated_at
      )
      SELECT
        'E2E Member ' || LPAD(gs::text, 2, '0'),
        'e2e.module.member.' || gs || '@uniconnect.test',
        '0311' || LPAD(gs::text, 7, '0'),
        'not-used-for-login',
        'male'::gender,
        'Student'::user_type,
        true,
        false,
        $1,
        NOW(),
        NOW()
      FROM generate_series(1, 22) AS gs
      RETURNING id
    `,
    [departmentId],
  );

  const extraMemberIds = extraMembersResult.rows.map((row) => row.id);

  if (extraMemberIds.length === 0) {
    throw new Error('Module 3 fixture members could not be created.');
  }

  await pool.query(
    `
      INSERT INTO server_memberships (user_id, server_id, is_auto_joined)
      SELECT member_id, $2, false
      FROM unnest($1::int[]) AS member_id
    `,
    [extraMemberIds, module3ServerId],
  );

  await pool.query(
    `
      INSERT INTO channels (server_id, name, description, type, is_auto_created, created_by, created_at)
      VALUES
        ($1, $2, $3, $4::channel_type, $5, $6, NOW() - INTERVAL '15 minutes'),
        ($1, $7, $8, $9::channel_type, $10, $6, NOW() - INTERVAL '10 minutes'),
        ($1, $11, $12, $9::channel_type, false, $6, NOW() - INTERVAL '5 minutes')
    `,
    [
      module3ServerId,
      'announcements',
      'Default announcement channel for Module 3 fixture server.',
      'announcement',
      true,
      managerUserId,
      'general',
      'General discussion for Module 3 runtime coverage.',
      'general',
      true,
      'project-lab',
      'Mutable channel used by Playwright to verify edit and lock actions.',
    ],
  );
}

async function findChannelIdByServerAndName(pool: Pool, serverId: number, name: string) {
  const result = await pool.query<{ id: number }>(
    'SELECT id FROM channels WHERE server_id = $1 AND name = $2 AND is_deleted = false LIMIT 1',
    [serverId, name],
  );

  return result.rows[0]?.id ?? null;
}

async function seedModule4Data(pool: Pool) {
  const managerUserId = await findUserIdByEmail(pool, e2eUsers.moduleManager.email);
  const serverResult = await pool.query<{ id: number }>(
    'SELECT id FROM servers WHERE name = $1 LIMIT 1',
    ['Engineering Faculty Hub'],
  );
  const serverId = serverResult.rows[0]?.id ?? null;

  if (!managerUserId || !serverId) {
    throw new Error('Module 4 E2E prerequisites were not created before seeding post data.');
  }

  const announcementChannelId = await findChannelIdByServerAndName(pool, serverId, 'announcements');

  if (!announcementChannelId) {
    throw new Error('Module 4 E2E announcement channel could not be found.');
  }

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
      VALUES ($1, $2, $3, 'general'::channel_type, true, false, $4, NOW())
    `,
    [
      serverId,
      'module4-locked',
      'Locked Module 4 fixture channel for publishing-affordance coverage.',
      managerUserId,
    ],
  );

  await pool.query(
    `
      INSERT INTO posts (
        author_id,
        channel_id,
        title,
        content,
        priority,
        is_pinned,
        pinned_by,
        pinned_at,
        created_at
      )
      VALUES
        ($1, $2, $3, $4, 'urgent'::post_priority, true, $1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
        ($1, $2, $5, $6, 'important'::post_priority, false, NULL, NULL, NOW() - INTERVAL '1 hour'),
        ($1, $2, $7, $8, 'normal'::post_priority, false, NULL, NULL, NOW() - INTERVAL '26 hours')
    `,
    [
      managerUserId,
      announcementChannelId,
      'Module 4 Pinned Safety Bulletin',
      '<p>Sanitized pinned content for Module 4 detail reading.</p>',
      'Module 4 Important Date Filter',
      '<p>Important content for priority and date filtering.</p>',
      'Module 4 Expired Edit Window',
      '<p>This post is old enough that edit controls should be hidden.</p>',
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

    await seedModule3Permissions(pool);
    await seedModule2Data(pool);
    await seedModule3Data(pool);
    await seedModule4Data(pool);
  } finally {
    await pool.end();
  }
}
