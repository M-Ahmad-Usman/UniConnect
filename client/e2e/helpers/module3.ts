import { withDb } from './db';

export const module3Fixtures = {
  serverName: 'Engineering Faculty Hub',
  announcementChannelName: 'announcements',
  mutableChannelName: 'project-lab',
  createdChannelName: 'studio-updates',
  editedChannelName: 'studio-roadmap',
  societyName: 'E2E Robotics Society',
} as const;

export async function findServerIdByName(name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number }>(
      'SELECT id FROM servers WHERE name = $1 LIMIT 1',
      [name],
    );

    return result.rows[0]?.id ?? null;
  });
}

export async function findChannelIdByName(serverId: number, name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number }>(
      'SELECT id FROM channels WHERE server_id = $1 AND name = $2 AND is_deleted = false LIMIT 1',
      [serverId, name],
    );

    return result.rows[0]?.id ?? null;
  });
}

export async function findSocietyIdByName(name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number }>(
      'SELECT id FROM societies WHERE name = $1 LIMIT 1',
      [name],
    );

    return result.rows[0]?.id ?? null;
  });
}

export async function ensurePendingSocietyRequest(societyId: number, userEmail: string) {
  await withDb(async (pool) => {
    await pool.query(
      `
        INSERT INTO society_membership_requests (society_id, user_id, status, requested_at)
        SELECT $1, users.id, 'pending'::membership_request_status, NOW()
        FROM users
        WHERE users.email = $2
        ON CONFLICT (society_id, user_id)
        DO UPDATE SET status = 'pending'::membership_request_status,
          requested_at = NOW(),
          reviewed_by = NULL,
          reviewed_at = NULL
      `,
      [societyId, userEmail],
    );
  });
}

export async function clearSocietyRequestAndMembership(societyId: number, userEmail: string) {
  await withDb(async (pool) => {
    await pool.query(
      `
        DELETE FROM society_membership_requests
        WHERE society_id = $1
          AND user_id = (SELECT id FROM users WHERE email = $2)
      `,
      [societyId, userEmail],
    );
    await pool.query(
      `
        DELETE FROM server_memberships
        WHERE user_id = (SELECT id FROM users WHERE email = $2)
          AND server_id = (SELECT server_id FROM societies WHERE id = $1)
      `,
      [societyId, userEmail],
    );
  });
}
