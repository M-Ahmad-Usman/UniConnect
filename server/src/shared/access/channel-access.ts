import { prisma } from "../../config/prisma.js";
import { getUserRoles } from "../../middleware/authorize.js";
import { ForbiddenError } from "../errors/index.js";
import type { UserRole } from "../types/index.js";
import type { PrismaTransaction } from "../lifecycle/society.js";

type ChannelAccessUser = {
  id: number;
  userType: string;
};

type ChannelAccessOptions = {
  userRoles?: UserRole[];
  allowManagementRead?: boolean;
};

type ChannelAccessSnapshot = {
  id: number;
  serverId: number;
  type: string;
  isLocked: boolean;
  isDeleted: boolean;
  isArchived: boolean;
  courseId: number | null;
  programId: number | null;
  server: {
    type: string;
    isDeleted: boolean;
    memberships: Array<{ userId: number }>;
    class: {
      id: number;
      crId: number | null;
      programId: number;
      program: { departmentId: number };
    } | null;
    society: {
      status: string;
      isDeleted: boolean;
      presidentId: number;
      convenorId: number;
    } | null;
  };
};

type ChannelAccessResult = {
  canRead: boolean;
  canPost: boolean;
  isDirectTeacher: boolean;
  isServerMember: boolean;
  isManager: boolean;
  channel: ChannelAccessSnapshot | null;
};

async function loadChannel(
  channelId: number,
  userId: number,
  client: PrismaTransaction,
): Promise<ChannelAccessSnapshot | null> {
  return client.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      serverId: true,
      type: true,
      isLocked: true,
      isDeleted: true,
      isArchived: true,
      courseId: true,
      programId: true,
      server: {
        select: {
          type: true,
          isDeleted: true,
          memberships: {
            where: { userId },
            select: { userId: true },
            take: 1,
          },
          class: {
            select: {
              id: true,
              crId: true,
              programId: true,
              program: { select: { departmentId: true } },
            },
          },
          society: {
            select: {
              status: true,
              isDeleted: true,
              presidentId: true,
              convenorId: true,
            },
          },
        },
      },
    },
  });
}

function isLifecycleReadable(channel: ChannelAccessSnapshot | null): channel is ChannelAccessSnapshot {
  if (!channel || channel.isDeleted || channel.server.isDeleted) {
    return false;
  }

  if (
    channel.server.society &&
    (channel.server.society.status !== "ACTIVE" || channel.server.society.isDeleted)
  ) {
    return false;
  }

  return true;
}

async function isDirectCourseTeacher(
  user: ChannelAccessUser,
  channel: ChannelAccessSnapshot,
  client: PrismaTransaction,
): Promise<boolean> {
  if (user.userType !== "TEACHER" || channel.type !== "COURSE") {
    return false;
  }

  const assignment = await client.teaches.findFirst({
    where: {
      teacherId: user.id,
      channelId: channel.id,
      courseId: channel.courseId ?? undefined,
    },
    select: { teacherId: true },
  });

  return assignment !== null;
}

async function isAcademicOrSocietyManager(
  userId: number,
  channel: ChannelAccessSnapshot,
  client: PrismaTransaction,
): Promise<boolean> {
  const classRecord = channel.server.class;
  if (classRecord) {
    if (classRecord.crId === userId) {
      return true;
    }

    const [hodDepartment, directedProgram] = await Promise.all([
      client.department.findFirst({
        where: { id: classRecord.program.departmentId, hodId: userId },
        select: { id: true },
      }),
      client.program.findFirst({
        where: { id: classRecord.programId, programDirectorId: userId },
        select: { id: true },
      }),
    ]);

    return hodDepartment !== null || directedProgram !== null;
  }

  const society = channel.server.society;
  if (society) {
    return society.presidentId === userId || society.convenorId === userId;
  }

  return false;
}

async function canPostWithRoles(
  userId: number,
  channel: ChannelAccessSnapshot,
  roles: UserRole[],
  client: PrismaTransaction,
): Promise<boolean> {
  for (const role of roles) {
    if (role.serverId !== channel.serverId) continue;

    switch (role.role) {
      case "hod":
        return true;
      case "program_director": {
        if (channel.type !== "PROGRAM" || !channel.programId) break;
        const program = await client.program.findFirst({
          where: { id: channel.programId, programDirectorId: userId },
          select: { id: true },
        });
        if (program) return true;
        break;
      }
      case "cr":
      case "society_president":
      case "society_convenor":
      case "server_moderator":
        return true;
      case "channel_moderator":
        if (role.channelId === channel.id) return true;
        break;
    }
  }

  return false;
}

export async function getChannelAccess(
  user: ChannelAccessUser,
  channelId: number,
  options: ChannelAccessOptions = {},
  client: PrismaTransaction = prisma,
): Promise<ChannelAccessResult> {
  const channel = await loadChannel(channelId, user.id, client);
  if (!isLifecycleReadable(channel)) {
    return {
      canRead: false,
      canPost: false,
      isDirectTeacher: false,
      isServerMember: false,
      isManager: false,
      channel,
    };
  }

  const isServerMember = channel.server.memberships.length > 0;
  const isDirectTeacher = await isDirectCourseTeacher(user, channel, client);
  const isManager =
    options.allowManagementRead === true
      ? await isAcademicOrSocietyManager(user.id, channel, client)
      : false;
  const canRead = user.userType === "ADMIN" || isServerMember || isDirectTeacher || isManager;

  if (!canRead || channel.isArchived || channel.isLocked) {
    return {
      canRead,
      canPost: false,
      isDirectTeacher,
      isServerMember,
      isManager,
      channel,
    };
  }

  if (user.userType === "ADMIN") {
    return { canRead, canPost: true, isDirectTeacher, isServerMember, isManager, channel };
  }

  const roles = options.userRoles ?? await getUserRoles(user.id);
  if (await canPostWithRoles(user.id, channel, roles, client)) {
    return { canRead, canPost: true, isDirectTeacher, isServerMember, isManager, channel };
  }

  if (isDirectTeacher) {
    return { canRead, canPost: true, isDirectTeacher, isServerMember, isManager, channel };
  }

  if (channel.type === "GENERAL" && isServerMember) {
    return { canRead, canPost: true, isDirectTeacher, isServerMember, isManager, channel };
  }

  return { canRead, canPost: false, isDirectTeacher, isServerMember, isManager, channel };
}

export async function assertCanReadChannel(
  user: ChannelAccessUser,
  channelId: number,
  options: ChannelAccessOptions = {},
  client: PrismaTransaction = prisma,
): Promise<ChannelAccessResult> {
  const access = await getChannelAccess(user, channelId, options, client);
  if (!access.canRead) {
    throw new ForbiddenError("You do not have permission to access this channel");
  }
  return access;
}

export async function assertCanPostInChannel(
  user: ChannelAccessUser,
  channelId: number,
  options: ChannelAccessOptions = {},
  client: PrismaTransaction = prisma,
): Promise<ChannelAccessResult> {
  const access = await getChannelAccess(user, channelId, options, client);
  if (!access.canPost) {
    throw new ForbiddenError("You do not have permission to post in this channel");
  }
  return access;
}
