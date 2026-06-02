import { ChannelType, type ChannelListItem, type CreateChannelResponse, type UpdateChannelResponse } from '@/types';

export interface ChannelGroup {
  key: ChannelListItem['type'];
  label: string;
  channels: ChannelListItem[];
}

const GROUP_ORDER = [
  ChannelType.ANNOUNCEMENT,
  ChannelType.COURSE,
  ChannelType.GENERAL,
  ChannelType.PROGRAM,
] as const;

const GROUP_LABELS: Record<ChannelListItem['type'], string> = {
  ANNOUNCEMENT: 'Announcements',
  COURSE: 'Courses',
  GENERAL: 'General',
  PROGRAM: 'Programs',
};

export function groupChannels(channels: ChannelListItem[]) {
  const grouped = new Map<ChannelListItem['type'], ChannelListItem[]>();

  channels.forEach((channel) => {
    const current = grouped.get(channel.type) ?? [];
    current.push(channel);
    grouped.set(channel.type, current);
  });

  return GROUP_ORDER.flatMap((type) => {
    const items = grouped.get(type) ?? [];
    if (items.length === 0) {
      return [];
    }

    return [
      {
        key: type,
        label: GROUP_LABELS[type],
        channels: items,
      } satisfies ChannelGroup,
    ];
  });
}

export function selectDefaultChannel(channels: ChannelListItem[]) {
  if (channels.length === 0) {
    return null;
  }

  const announcementChannel = channels.find((channel) => channel.type === ChannelType.ANNOUNCEMENT);
  if (announcementChannel) {
    return announcementChannel;
  }

  const generalChannel = channels.find((channel) => channel.type === ChannelType.GENERAL);
  if (generalChannel) {
    return generalChannel;
  }

  return channels[0] ?? null;
}

function sortChannelsByCreatedAt(channels: ChannelListItem[]) {
  return [...channels].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function insertChannel(channels: ChannelListItem[], channel: CreateChannelResponse) {
  const nextChannel: ChannelListItem = {
    ...channel,
    isArchived: false,
    courseId: null,
    programId: null,
  };

  const withoutExisting = channels.filter((current) => current.publicId !== channel.publicId);
  return sortChannelsByCreatedAt([...withoutExisting, nextChannel]);
}

export function updateChannelInList(
  channels: ChannelListItem[],
  channel: UpdateChannelResponse,
) {
  return channels.map((current) =>
    current.publicId === channel.publicId
      ? {
          ...current,
          ...channel,
        }
      : current,
  );
}

export function removeChannelFromList(channels: ChannelListItem[], channelPublicId: string) {
  return channels.filter((channel) => channel.publicId !== channelPublicId);
}
