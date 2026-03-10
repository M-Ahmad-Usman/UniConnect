import { describe, expect, it } from 'vitest';
import { ChannelType, type ChannelListItem } from '@/types';
import { groupChannels, selectDefaultChannel } from '../utils';

const channels: ChannelListItem[] = [
  {
    id: 1,
    name: 'general',
    description: null,
    type: ChannelType.GENERAL,
    isLocked: false,
    isArchived: false,
    isAutoCreated: true,
    courseId: null,
    programId: null,
    createdAt: '2026-03-10T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'announcements',
    description: null,
    type: ChannelType.ANNOUNCEMENT,
    isLocked: false,
    isArchived: false,
    isAutoCreated: true,
    courseId: null,
    programId: null,
    createdAt: '2026-03-10T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'cs-401',
    description: null,
    type: ChannelType.COURSE,
    isLocked: true,
    isArchived: false,
    isAutoCreated: false,
    courseId: 99,
    programId: null,
    createdAt: '2026-03-10T00:00:00.000Z',
  },
];

describe('groupChannels', () => {
  it('groups channels in the expected display order', () => {
    const groupedChannels = groupChannels(channels);

    expect(groupedChannels.map((group) => group.key)).toEqual([
      ChannelType.ANNOUNCEMENT,
      ChannelType.COURSE,
      ChannelType.GENERAL,
    ]);
  });

  it('omits empty groups', () => {
    const groupedChannels = groupChannels([
      {
        id: 10,
        name: 'general',
        description: null,
        type: ChannelType.GENERAL,
        isLocked: false,
        isArchived: false,
        isAutoCreated: true,
        courseId: null,
        programId: null,
        createdAt: '2026-03-10T00:00:00.000Z',
      },
    ]);

    expect(groupedChannels).toHaveLength(1);
    expect(groupedChannels[0]?.key).toBe(ChannelType.GENERAL);
  });
});

describe('selectDefaultChannel', () => {
  it('prefers an announcement channel first', () => {
    expect(selectDefaultChannel(channels)?.id).toBe(2);
  });

  it('falls back to a general channel when no announcement channel exists', () => {
    const nextChannel = selectDefaultChannel(channels.filter((channel) => channel.id !== 2));
    expect(nextChannel?.id).toBe(1);
  });

  it('falls back to the first available channel when no announcement or general channel exists', () => {
    const nextChannel = selectDefaultChannel([
      {
        id: 12,
        name: 'cs-401',
        description: null,
        type: ChannelType.COURSE,
        isLocked: true,
        isArchived: false,
        isAutoCreated: false,
        courseId: 99,
        programId: null,
        createdAt: '2026-03-10T00:00:00.000Z',
      },
    ]);

    expect(nextChannel?.id).toBe(12);
  });

  it('returns null when there are no channels', () => {
    expect(selectDefaultChannel([])).toBeNull();
  });
});