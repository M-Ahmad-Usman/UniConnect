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

export async function findPostIdByTitle(title: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number }>(
      'SELECT id FROM posts WHERE title = $1 AND is_deleted = false LIMIT 1',
      [title],
    );

    return result.rows[0]?.id ?? null;
  });
}
