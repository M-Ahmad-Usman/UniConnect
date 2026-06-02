import { withDb } from './db';

export const module4Fixtures = {
  serverName: 'Engineering Faculty Hub',
  announcementChannelName: 'announcements',
  lockedCourseChannelName: 'module4-locked',
  pinnedPostTitle: 'Module 4 Pinned Safety Bulletin',
  importantPostTitle: 'Module 4 Important Date Filter',
  expiredPostTitle: 'Module 4 Expired Edit Window',
  createdPostTitle: 'Module 4 Runtime Draft',
  editedPostTitle: 'Module 4 Runtime Draft Edited',
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
