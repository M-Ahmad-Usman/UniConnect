import { withDb } from './db';

export const module2Fixtures = {
  shellServerName: 'Computer Science Hub',
  announcementChannelName: 'announcements',
  generalChannelName: 'general',
  notificationServerName: 'Realtime Updates Hub',
  notificationChannelName: 'updates',
  searchablePostTitle: 'Searchable Architecture Notes',
  filteredOutPostTitle: 'Module 2 Runtime Update',
  notificationTitle: 'Realtime Notification Drill',
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
      'SELECT id FROM channels WHERE server_id = $1 AND name = $2 LIMIT 1',
      [serverId, name],
    );

    return result.rows[0]?.id ?? null;
  });
}