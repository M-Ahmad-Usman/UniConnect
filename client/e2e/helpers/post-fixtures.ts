import { withDb } from './db';

export const postFixtures = {
  serverName: 'Engineering Faculty Hub',
  announcementChannelName: 'announcements',
  lockedCourseChannelName: 'post-flow-locked',
  pinnedPostTitle: 'Pinned Safety Bulletin',
  importantPostTitle: 'Important Date Filter',
  expiredPostTitle: 'Expired Edit Window',
  createdPostTitle: 'Runtime Draft',
  editedPostTitle: 'Runtime Draft Edited',
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

export async function findPostIdByTitle(title: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number }>(
      'SELECT id FROM posts WHERE title = $1 AND is_deleted = false LIMIT 1',
      [title],
    );

    return result.rows[0]?.id ?? null;
  });
}
