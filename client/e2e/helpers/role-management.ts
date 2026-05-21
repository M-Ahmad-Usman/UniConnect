import { withDb } from './db';

export async function findClassByServerName(serverName: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number; server_id: number; department_id: number }>(
      `
        SELECT c.id, c.server_id, p.department_id
        FROM classes c
        INNER JOIN programs p ON p.id = c.program_id
        INNER JOIN servers s ON s.id = c.server_id
        WHERE s.name = $1
        LIMIT 1
      `,
      [serverName],
    );

    return result.rows[0] ?? null;
  });
}

export async function findSocietyServerByName(societyName: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number; server_id: number }>(
      'SELECT id, server_id FROM societies WHERE name = $1 LIMIT 1',
      [societyName],
    );

    return result.rows[0] ?? null;
  });
}

export async function prepareStudentForClass(userId: number, classId: number, departmentId: number) {
  await withDb(async (pool) => {
    const classResult = await pool.query<{ server_id: number }>(
      'SELECT server_id FROM classes WHERE id = $1 LIMIT 1',
      [classId],
    );
    const serverId = classResult.rows[0]?.server_id;
    if (!serverId) throw new Error('Class server not found');

    await pool.query('UPDATE users SET department_id = $2 WHERE id = $1', [userId, departmentId]);
    await pool.query(
      `
        INSERT INTO student_info (student_id, class_id, roll_number)
        VALUES ($1, $2, $3)
        ON CONFLICT (student_id)
        DO UPDATE SET class_id = EXCLUDED.class_id
      `,
      [userId, classId, `26-NTU-RM-${String(userId).padStart(3, '0')}`],
    );
    await pool.query(
      `
        INSERT INTO server_memberships (user_id, server_id, is_auto_joined)
        VALUES ($1, $2, true)
        ON CONFLICT (user_id, server_id) DO NOTHING
      `,
      [userId, serverId],
    );
  });
}

export async function clearClassCr(classId: number) {
  await withDb(async (pool) => {
    await pool.query('UPDATE classes SET cr_id = NULL WHERE id = $1', [classId]);
  });
}

export async function setClassCr(classId: number, userId: number) {
  await withDb(async (pool) => {
    await pool.query('UPDATE classes SET cr_id = $2 WHERE id = $1', [classId, userId]);
  });
}

export async function findClassCrId(classId: number) {
  return withDb(async (pool) => {
    const result = await pool.query<{ cr_id: number | null }>(
      'SELECT cr_id FROM classes WHERE id = $1 LIMIT 1',
      [classId],
    );

    return result.rows[0]?.cr_id ?? null;
  });
}

export async function ensureServerMembership(userId: number, serverId: number) {
  await withDb(async (pool) => {
    await pool.query(
      `
        INSERT INTO server_memberships (user_id, server_id, is_auto_joined)
        VALUES ($1, $2, true)
        ON CONFLICT (user_id, server_id) DO NOTHING
      `,
      [userId, serverId],
    );
  });
}

export async function clearServerModerator(userId: number, serverId: number) {
  await withDb(async (pool) => {
    await pool.query(
      'DELETE FROM moderator_assignments WHERE user_id = $1 AND server_id = $2 AND channel_id IS NULL',
      [userId, serverId],
    );
  });
}

export async function hasServerModerator(userId: number, serverId: number) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number }>(
      `
        SELECT id
        FROM moderator_assignments
        WHERE user_id = $1 AND server_id = $2 AND channel_id IS NULL
        LIMIT 1
      `,
      [userId, serverId],
    );

    return result.rowCount > 0;
  });
}
