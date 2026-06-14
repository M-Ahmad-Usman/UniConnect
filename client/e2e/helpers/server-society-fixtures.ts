import { withDb } from './db';

export const serverSocietyFixtures = {
  serverName: 'Engineering Faculty Hub',
  announcementChannelName: 'announcements',
  mutableChannelName: 'project-lab',
  createdChannelName: 'studio-updates',
  editedChannelName: 'studio-roadmap',
  societyName: 'E2E Robotics Society',
} as const;

export async function findServerPublicIdByName(name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ public_id: string }>(
      'SELECT public_id FROM servers WHERE name = $1 LIMIT 1',
      [name],
    );

    return result.rows[0]?.public_id ?? null;
  });
}

export async function findChannelPublicIdByName(serverPublicId: string, name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ public_id: string }>(
      `
        SELECT channel.public_id
        FROM channels channel
        INNER JOIN servers server ON server.id = channel.server_id
        WHERE server.public_id = $1 AND channel.name = $2 AND channel.is_deleted = false
        LIMIT 1
      `,
      [serverPublicId, name],
    );

    return result.rows[0]?.public_id ?? null;
  });
}

export async function findSocietyByName(name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number; public_id: string }>(
      'SELECT id, public_id FROM societies WHERE name = $1 LIMIT 1',
      [name],
    );

    const society = result.rows[0];
    return society ? { id: society.id, publicId: society.public_id } : null;
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
