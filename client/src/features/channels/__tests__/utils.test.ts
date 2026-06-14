import { describe, expect, it } from 'vitest';
import { ChannelType, type ChannelListItem } from '@/types';
import { groupChannels, insertChannel, removeChannelFromList, selectDefaultChannel, updateChannelInList } from '../utils';

const channels: ChannelListItem[] = [
  {
    publicId: 'channel-1',
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
    publicId: 'channel-2',
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
    publicId: 'channel-3',
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
        publicId: 'channel-10',
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
    expect(selectDefaultChannel(channels)?.publicId).toBe('channel-2');
  });

  it('falls back to a general channel when no announcement channel exists', () => {
    const nextChannel = selectDefaultChannel(
      channels.filter((channel) => channel.publicId !== 'channel-2'),
    );
    expect(nextChannel?.publicId).toBe('channel-1');
  });

  it('falls back to the first available channel when no announcement or general channel exists', () => {
    const nextChannel = selectDefaultChannel([
      {
        publicId: 'channel-12',
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

    expect(nextChannel?.publicId).toBe('channel-12');
  });

  it('returns null when there are no channels', () => {
    expect(selectDefaultChannel([])).toBeNull();
  });
});

describe('insertChannel', () => {
  it('adds a new channel and preserves created-at ordering', () => {
    const inserted = insertChannel(channels, {
      publicId: 'channel-4',
      serverPublicId: 'server-10',
      name: 'fresh-updates',
      description: null,
      type: ChannelType.GENERAL,
      isLocked: false,
      isAutoCreated: false,
      createdAt: '2026-03-10T01:00:00.000Z',
    });

    expect(inserted.map((channel) => channel.publicId)).toEqual([
      'channel-1',
      'channel-2',
      'channel-3',
      'channel-4',
    ]);
    expect(inserted[3]).toMatchObject({
      publicId: 'channel-4',
      isArchived: false,
      courseId: null,
      programId: null,
    });
  });
});

describe('updateChannelInList', () => {
  it('merges updated channel fields without losing list-only metadata', () => {
    const updated = updateChannelInList(channels, {
      publicId: 'channel-3',
      serverPublicId: 'server-10',
      name: 'cs-401-updated',
      description: 'Updated description',
      type: ChannelType.COURSE,
      isLocked: false,
      isAutoCreated: false,
      isDeleted: false,
      isArchived: false,
      createdAt: '2026-03-10T00:00:00.000Z',
    });

    expect(updated.find((channel) => channel.publicId === 'channel-3')).toMatchObject({
      publicId: 'channel-3',
      name: 'cs-401-updated',
      isLocked: false,
      courseId: 99,
    });
  });
});

describe('removeChannelFromList', () => {
  it('removes the deleted channel from the cache snapshot', () => {
    expect(removeChannelFromList(channels, 'channel-2').map((channel) => channel.publicId)).toEqual([
      'channel-1',
      'channel-3',
    ]);
  });
});
