import { describe, expect, it } from 'vitest';
import { getNearestRoleExpiryDelay } from '@/lib/role-session';

describe('role expiry scheduling', () => {
  it('returns the nearest future platform-role expiry', () => {
    const now = Date.parse('2026-05-30T12:00:00.000Z');
    expect(
      getNearestRoleExpiryDelay(
        [
          { role: 'hod', serverId: 1, scopeType: 'server' },
          {
            role: 'server_moderator',
            serverId: 1,
            scopeType: 'server',
            expiresAt: '2026-05-30T12:02:00.000Z',
          },
          {
            role: 'channel_moderator',
            serverId: 1,
            channelId: 2,
            scopeType: 'channel',
            expiresAt: '2026-05-30T12:01:00.000Z',
          },
        ],
        now,
      ),
    ).toBe(60_000);
  });

  it('ignores permanent, invalid, and already expired assignments', () => {
    const now = Date.parse('2026-05-30T12:00:00.000Z');
    expect(
      getNearestRoleExpiryDelay(
        [
          { role: 'server_moderator', serverId: 1, scopeType: 'server', expiresAt: null },
          { role: 'server_moderator', serverId: 1, scopeType: 'server', expiresAt: 'invalid' },
          {
            role: 'channel_moderator',
            serverId: 1,
            scopeType: 'channel',
            expiresAt: '2026-05-30T11:59:00.000Z',
          },
        ],
        now,
      ),
    ).toBeNull();
  });
});
