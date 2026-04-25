import { withDb } from './db';

export const module3Fixtures = {
  serverName: 'Engineering Faculty Hub',
  announcementChannelName: 'announcements',
  mutableChannelName: 'project-lab',
  createdChannelName: 'studio-updates',
  editedChannelName: 'studio-roadmap',
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
