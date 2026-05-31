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
const e2eEnvPath = path.resolve(serverDir, '.env.e2e');

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

async function loadEnvFile(filePath: string) {
  try {
    const contents = await readFile(filePath, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
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

async function seedDesignations(pool: Pool) {
  const designations = [
    'Assistant Professor',
    'Society Convenor',
    'Other Department Teacher',
    'Professor',
    'Program Director',
    'Lecturer',
    'Visiting Lecturer',
    'Senior Lecturer',
  ];
  await pool.query(
    `
      INSERT INTO designations (value, label)
      SELECT designation, designation
      FROM UNNEST($1::text[]) designation
    `,
    [designations],
  );
}

async function seedModule3Permissions(pool: Pool) {
  await pool.query(
    `
      INSERT INTO roles (name, scope_type)
      VALUES
        ('server_moderator', 'server'::platform_role_scope_type),
        ('channel_moderator', 'channel'::platform_role_scope_type)
    `,
  );

  await pool.query(
    `
      INSERT INTO permissions (name)
      VALUES ($1)
    `,
    ['post:channel'],
  );

  await pool.query(
    `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE p.name = $1
    `,
    ['post:channel'],
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

async function seedSocietyHardeningData(pool: Pool) {
  const presidentId = await findUserIdByEmail(pool, e2eUsers.moduleSocietyPresident.email);
  const convenorId = await findUserIdByEmail(pool, e2eUsers.moduleSocietyConvenor.email);
  const memberId = await findUserIdByEmail(pool, e2eUsers.moduleSocietyMember.email);
  const applicantId = await findUserIdByEmail(pool, e2eUsers.moduleSocietyApplicant.email);
  const outsiderTeacherId = await findUserIdByEmail(
    pool,
    e2eUsers.moduleSocietyOutsiderTeacher.email,
  );

  if (!presidentId || !convenorId || !memberId || !applicantId || !outsiderTeacherId) {
    throw new Error('Society hardening E2E users were not created before seeding data.');
  }

  const departmentServer = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, 'Department'::server_type, $3, NOW())
      RETURNING id
    `,
    ['E2E Society Department', 'Department fixture for society hardening.', convenorId],
  );
  const departmentServerId = departmentServer.rows[0]?.id;

  const societyServer = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, 'Society'::server_type, $3, NOW())
      RETURNING id
    `,
    ['E2E Robotics Society', 'Society fixture for access hardening.', convenorId],
  );
  const societyServerId = societyServer.rows[0]?.id;

  const outsiderServer = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, 'Department'::server_type, $3, NOW())
      RETURNING id
    `,
    ['E2E Other Society Department', 'Other department fixture.', outsiderTeacherId],
  );
  const outsiderServerId = outsiderServer.rows[0]?.id;

  if (!departmentServerId || !societyServerId || !outsiderServerId) {
    throw new Error('Society hardening E2E servers could not be created.');
  }

  const department = await pool.query<{ id: number }>(
    `
      INSERT INTO departments (name, code, server_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    ['E2E Society Department', 'E2E-SOC', departmentServerId],
  );
  const departmentId = department.rows[0]?.id;
  const outsiderDepartment = await pool.query<{ id: number }>(
    `
      INSERT INTO departments (name, code, server_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    ['E2E Other Society Department', 'E2E-OSOC', outsiderServerId],
  );
  const outsiderDepartmentId = outsiderDepartment.rows[0]?.id;

  if (!departmentId || !outsiderDepartmentId) {
    throw new Error('Society hardening E2E departments could not be created.');
  }

  const degree = await pool.query<{ id: number }>(
    'INSERT INTO degree_levels (level) VALUES ($1) RETURNING id',
    ['BS-SOC-E2E'],
  );
  const discipline = await pool.query<{ id: number }>(
    'INSERT INTO disciplines (name) VALUES ($1) RETURNING id',
    ['Society E2E Discipline'],
  );
  const degreeId = degree.rows[0]?.id;
  const disciplineId = discipline.rows[0]?.id;

  if (!degreeId || !disciplineId) {
    throw new Error('Society hardening E2E catalog records could not be created.');
  }

  const program = await pool.query<{ id: number }>(
    `
      INSERT INTO programs (department_id, discipline_id, degree_level_id, semesters, code)
      VALUES ($1, $2, $3, 8, $4)
      RETURNING id
    `,
    [departmentId, disciplineId, degreeId, 'SOC-E2E'],
  );
  const programId = program.rows[0]?.id;
  const classServer = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, 'Class'::server_type, $3, NOW())
      RETURNING id
    `,
    ['E2E Society Class', 'Class fixture for society students.', convenorId],
  );
  const classServerId = classServer.rows[0]?.id;

  if (!programId || !classServerId) {
    throw new Error('Society hardening E2E class prerequisites could not be created.');
  }

  const classRecord = await pool.query<{ id: number }>(
    `
      INSERT INTO classes (
        program_id,
        current_semester,
        academic_year,
        admission_year,
        section,
        server_id
      )
      VALUES ($1, 3, 2026, 2026, 'A'::section, $2)
      RETURNING id
    `,
    [programId, classServerId],
  );
  const classId = classRecord.rows[0]?.id;

  if (!classId) {
    throw new Error('Society hardening E2E class could not be created.');
  }

  await pool.query(
    `
      UPDATE users
      SET department_id = CASE
        WHEN id = $2 THEN $3::int
        ELSE $4::int
      END
      WHERE id = ANY($1::int[])
    `,
    [
      [presidentId, convenorId, memberId, applicantId, outsiderTeacherId],
      outsiderTeacherId,
      outsiderDepartmentId,
      departmentId,
    ],
  );

  await pool.query(
    `
      INSERT INTO teacher_info (teacher_id, designation)
      VALUES
        ($1, 'Society Convenor'),
        ($2, 'Other Department Teacher')
    `,
    [convenorId, outsiderTeacherId],
  );

  await pool.query(
    `
      INSERT INTO student_info (student_id, class_id, roll_number)
      VALUES
        ($1, $4, 5001),
        ($2, $4, 5002),
        ($3, $4, 5003)
    `,
    [presidentId, memberId, applicantId, classId],
  );

  const society = await pool.query<{ id: number }>(
    `
      INSERT INTO societies (
        name,
        description,
        department_id,
        president_id,
        convenor_id,
        server_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [
      'E2E Robotics Society',
      'Deterministic society fixture for hardening tests.',
      departmentId,
      presidentId,
      convenorId,
      societyServerId,
    ],
  );
  const societyId = society.rows[0]?.id;

  if (!societyId) {
    throw new Error('Society hardening E2E society could not be created.');
  }

  await pool.query(
    `
      INSERT INTO server_memberships (user_id, server_id, is_auto_joined)
      VALUES
        ($1, $4, true),
        ($2, $4, true),
        ($3, $4, false)
    `,
    [presidentId, convenorId, memberId, societyServerId],
  );

  await pool.query(
    `
      INSERT INTO channels (server_id, name, description, type, is_auto_created, created_by, created_at)
      VALUES
        ($1, 'announcements', 'Society announcements.', 'announcement'::channel_type, true, $2, NOW()),
        ($1, 'general', 'Society coordination.', 'general'::channel_type, true, $3, NOW())
    `,
    [societyServerId, convenorId, presidentId],
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
  const result = await pool.query<SeededUserRow>(
    'SELECT id, email FROM users WHERE email = $1 LIMIT 1',
    [email],
  );

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
    [
      'Computer Science Hub',
      'Department-wide communication and announcements.',
      'Department',
      shellUserId,
    ],
  );
  const shellServerId = shellServerResult.rows[0]?.id;

  const notificationServerResult = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, $3::server_type, $4, NOW())
      RETURNING id
    `,
    [
      'Realtime Updates Hub',
      'Notifications-focused runtime workspace.',
      'Department',
      notificationUserId,
    ],
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

async function createAcademicClass(
  pool: Pool,
  input: {
    programId: number;
    createdBy: number;
    serverName: string;
    currentSemester: number;
    section: 'A' | 'B';
  },
) {
  const serverResult = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, 'Class'::server_type, $3, NOW())
      RETURNING id
    `,
    [input.serverName, 'Academic hardening class fixture.', input.createdBy],
  );
  const serverId = serverResult.rows[0]?.id;

  if (!serverId) {
    throw new Error(`Academic class server could not be created: ${input.serverName}`);
  }

  const classResult = await pool.query<{ id: number; server_id: number }>(
    `
      INSERT INTO classes (
        program_id,
        current_semester,
        academic_year,
        admission_year,
        section,
        server_id
      )
      VALUES ($1, $2, 2026, 2026, $3::section, $4)
      RETURNING id, server_id
    `,
    [input.programId, input.currentSemester, input.section, serverId],
  );
  const classRecord = classResult.rows[0];

  if (!classRecord) {
    throw new Error(`Academic class could not be created: ${input.serverName}`);
  }

  return classRecord;
}

async function seedModule2AcademicHardeningData(pool: Pool) {
  const hodId = await findUserIdByEmail(pool, e2eUsers.moduleAcademicHod.email);
  const pdId = await findUserIdByEmail(pool, e2eUsers.moduleAcademicPd.email);
  const oldTeacherId = await findUserIdByEmail(pool, e2eUsers.moduleAcademicOldTeacher.email);
  const crossTeacherId = await findUserIdByEmail(pool, e2eUsers.moduleAcademicCrossTeacher.email);
  const progressTeacherId = await findUserIdByEmail(
    pool,
    e2eUsers.moduleAcademicProgressTeacher.email,
  );
  const graduateTeacherId = await findUserIdByEmail(
    pool,
    e2eUsers.moduleAcademicGraduateTeacher.email,
  );
  const transferStudentId = await findUserIdByEmail(
    pool,
    e2eUsers.moduleAcademicTransferStudent.email,
  );

  if (
    !hodId ||
    !pdId ||
    !oldTeacherId ||
    !crossTeacherId ||
    !progressTeacherId ||
    !graduateTeacherId ||
    !transferStudentId
  ) {
    throw new Error('Academic hardening E2E users were not created before seeding data.');
  }

  await pool.query(
    `
      INSERT INTO teacher_info (teacher_id, designation)
      VALUES
        ($1, 'Professor'),
        ($2, 'Program Director'),
        ($3, 'Lecturer'),
        ($4, 'Visiting Lecturer'),
        ($5, 'Assistant Professor'),
        ($6, 'Senior Lecturer')
    `,
    [hodId, pdId, oldTeacherId, crossTeacherId, progressTeacherId, graduateTeacherId],
  );

  const academicDeptServer = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, 'Department'::server_type, $3, NOW())
      RETURNING id
    `,
    ['Academic Hardening Department', 'Department fixture for academic hardening.', hodId],
  );
  const crossDeptServer = await pool.query<{ id: number }>(
    `
      INSERT INTO servers (name, description, type, created_by, created_at)
      VALUES ($1, $2, 'Department'::server_type, $3, NOW())
      RETURNING id
    `,
    ['Academic Cross Department', 'Cross-department teacher fixture.', hodId],
  );
  const academicServerId = academicDeptServer.rows[0]?.id;
  const crossServerId = crossDeptServer.rows[0]?.id;

  if (!academicServerId || !crossServerId) {
    throw new Error('Academic hardening department servers could not be created.');
  }

  const academicDept = await pool.query<{ id: number }>(
    `
      INSERT INTO departments (name, code, hod_id, server_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    ['E2E Academic Department', 'E2E-ACAD', hodId, academicServerId],
  );
  const crossDept = await pool.query<{ id: number }>(
    `
      INSERT INTO departments (name, code, server_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    ['E2E Cross Department', 'E2E-XDEP', crossServerId],
  );
  const academicDeptId = academicDept.rows[0]?.id;
  const crossDeptId = crossDept.rows[0]?.id;

  if (!academicDeptId || !crossDeptId) {
    throw new Error('Academic hardening departments could not be created.');
  }

  await pool.query(
    `
      UPDATE users
      SET department_id = CASE
        WHEN id = $4 THEN $2::int
        ELSE $1::int
      END
      WHERE id = ANY($3::int[])
    `,
    [
      academicDeptId,
      crossDeptId,
      [
        hodId,
        pdId,
        oldTeacherId,
        progressTeacherId,
        graduateTeacherId,
        transferStudentId,
        crossTeacherId,
      ],
      crossTeacherId,
    ],
  );

  const degreeResult = await pool.query<{ id: number }>(
    'INSERT INTO degree_levels (level) VALUES ($1) RETURNING id',
    ['E2E Bachelor'],
  );
  const disciplineResult = await pool.query<{ id: number }>(
    'INSERT INTO disciplines (name) VALUES ($1) RETURNING id',
    ['E2E Academic Discipline'],
  );
  const degreeLevelId = degreeResult.rows[0]?.id;
  const disciplineId = disciplineResult.rows[0]?.id;

  if (!degreeLevelId || !disciplineId) {
    throw new Error('Academic hardening catalog records could not be created.');
  }

  const programResult = await pool.query<{ id: number }>(
    `
      INSERT INTO programs (
        department_id,
        discipline_id,
        degree_level_id,
        semesters,
        code,
        program_director_id
      )
      VALUES ($1, $2, $3, 8, 'E2EACAD', $4)
      RETURNING id
    `,
    [academicDeptId, disciplineId, degreeLevelId, pdId],
  );
  const programId = programResult.rows[0]?.id;

  if (!programId) {
    throw new Error('Academic hardening program could not be created.');
  }

  const transferSource = await createAcademicClass(pool, {
    programId,
    createdBy: hodId,
    serverName: 'Academic Transfer Source Class',
    currentSemester: 1,
    section: 'A',
  });
  await createAcademicClass(pool, {
    programId,
    createdBy: hodId,
    serverName: 'Academic Transfer Target Class',
    currentSemester: 1,
    section: 'B',
  });
  const replaceClass = await createAcademicClass(pool, {
    programId,
    createdBy: hodId,
    serverName: 'Academic Teacher Replacement Class',
    currentSemester: 2,
    section: 'A',
  });
  await createAcademicClass(pool, {
    programId,
    createdBy: hodId,
    serverName: 'Academic Semester Progression Class',
    currentSemester: 3,
    section: 'A',
  });
  const graduationClass = await createAcademicClass(pool, {
    programId,
    createdBy: hodId,
    serverName: 'Academic Graduation Class',
    currentSemester: 8,
    section: 'A',
  });

  await pool.query(
    `
      INSERT INTO student_info (student_id, class_id, roll_number)
      VALUES ($1, $2, '26-NTU-E2E-001')
    `,
    [transferStudentId, transferSource.id],
  );
  await pool.query(
    `
      INSERT INTO server_memberships (user_id, server_id, is_auto_joined)
      VALUES ($1, $2, true)
    `,
    [transferStudentId, transferSource.server_id],
  );

  const courses = await pool.query<{ id: number; code: string }>(
    `
      INSERT INTO courses (title, code, credit_hours, department_id)
      VALUES
        ('Replacement Systems', 'E2E-RP-101', 3, $1),
        ('Progression Studio', 'E2E-SP-401', 3, $1),
        ('Graduation Seminar', 'E2E-GR-801', 3, $1)
      RETURNING id, code
    `,
    [academicDeptId],
  );
  const replacementCourse = courses.rows.find((course) => course.code === 'E2E-RP-101');
  const progressionCourse = courses.rows.find((course) => course.code === 'E2E-SP-401');
  const graduationCourse = courses.rows.find((course) => course.code === 'E2E-GR-801');

  if (!replacementCourse || !progressionCourse || !graduationCourse) {
    throw new Error('Academic hardening courses could not be created.');
  }

  await pool.query(
    `
      INSERT INTO program_curriculum (program_id, course_id, semester_number, batch_year)
      VALUES
        ($1, $2, 2, 2026),
        ($1, $3, 4, 2026),
        ($1, $4, 8, 2026)
    `,
    [programId, replacementCourse.id, progressionCourse.id, graduationCourse.id],
  );

  await pool.query(
    `
      INSERT INTO teaches (teacher_id, course_id, class_id)
      VALUES
        ($1, $2, $3),
        ($4, $5, $6)
    `,
    [
      oldTeacherId,
      replacementCourse.id,
      replaceClass.id,
      graduateTeacherId,
      graduationCourse.id,
      graduationClass.id,
    ],
  );
  await pool.query(
    `
      INSERT INTO server_memberships (user_id, server_id, is_auto_joined)
      VALUES
        ($1, $2, true),
        ($3, $4, true)
    `,
    [oldTeacherId, replaceClass.server_id, graduateTeacherId, graduationClass.server_id],
  );
  await pool.query(
    `
      INSERT INTO channels (server_id, name, type, course_id, is_auto_created, created_by, created_at)
      VALUES
        ($1, $2, 'course'::channel_type, $3, true, $4, NOW()),
        ($5, $6, 'course'::channel_type, $7, true, $4, NOW())
    `,
    [
      replaceClass.server_id,
      replacementCourse.code,
      replacementCourse.id,
      hodId,
      graduationClass.server_id,
      graduationCourse.code,
      graduationCourse.id,
    ],
  );
}

export default async function globalSetup() {
  await loadEnvFile(e2eEnvPath);
  const pool = createDbPool();

  try {
    await applyMigrations(pool);
    await seedDesignations(pool);

    for (const user of Object.values(e2eUsers)) {
      await createUser(pool, user);
    }

    await seedModule3Permissions(pool);
    await seedModule2Data(pool);
    await seedModule2AcademicHardeningData(pool);
    await seedModule3Data(pool);
    await seedSocietyHardeningData(pool);
    await seedModule4Data(pool);
  } finally {
    await pool.end();
  }
}
