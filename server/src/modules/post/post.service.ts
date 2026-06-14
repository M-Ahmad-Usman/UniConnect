import type { PostPriority, ServerType } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import {
  cleanupCloudinaryUploads,
  cloudinaryService,
  type CloudinaryUpload,
} from "../../config/cloudinary.js";
import {
  ApiErrorCode,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/index.js";
import {
  parsePagination,
  buildPaginationResponse,
} from "../../shared/utils/pagination.js";
import { MAX_ATTACHMENTS } from "../../shared/constants.js";
import { canPostInChannel } from "../channel/channel.service.js";
import { emitPostNotificationsDeleted } from "../notification/notification.service.js";
import { invalidateSystemStatsCache } from "../admin/admin.service.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { appEvents, APP_EVENTS } from "../../shared/events.js";
import { emitToChannel } from "../../socket/index.js";
import type { UserRole } from "../../shared/types/index.js";
import { activePlatformRoleAssignmentWhere } from "../../shared/roles/index.js";
import { getUserRoles } from "../../middleware/authorize.js";
import {
  assertServerAcceptsWrites,
  type PrismaTransaction,
} from "../../shared/lifecycle/society.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type CallerInfo = {
  id: number;
  userType: string;
  userRoles?: UserRole[];
};

type CreatePostInput = {
  title: string;
  content: string;
  priority?: PostPriority;
};

type UpdatePostInput = {
  title?: string;
  content?: string;
  priority?: PostPriority;
};

type ListPostsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  priority?: PostPriority;
  startDate?: Date | string;
  endDate?: Date | string;
};

type PinPostInput = {
  isPinned: boolean;
};

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

// ─── Select Constants ──────────────────────────────────────────────────────

const postListSelect = {
  id: true,
  publicId: true,
  title: true,
  content: true,
  priority: true,
  isPinned: true,
  pinnedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      email: true,
      userType: true,
      profilePictureUrl: true,
    },
  },
  _count: {
    select: { attachments: true },
  },
  attachments: {
    select: {
      id: true,
      fileUrl: true,
      fileType: true,
      fileSize: true,
      uploadedAt: true,
    },
    orderBy: { uploadedAt: "asc" },
    take: MAX_ATTACHMENTS,
  },
} as const;

const postDetailSelect = {
  id: true,
  publicId: true,
  title: true,
  content: true,
  priority: true,
  isPinned: true,
  pinnedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      email: true,
      userType: true,
      profilePictureUrl: true,
    },
  },
  attachments: {
    select: {
      id: true,
      fileUrl: true,
      fileType: true,
      fileSize: true,
      uploadedAt: true,
    },
  },
  pinner: {
    select: { id: true, publicId: true, fullName: true },
  },
} as const;

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function findWritablePostOrThrow(
  postId: number,
  client: PrismaTransaction = prisma,
) {
  const post = await client.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      publicId: true,
      authorId: true,
      channelId: true,
      createdAt: true,
      isDeleted: true,
      channel: {
        select: {
          serverId: true,
          publicId: true,
          isDeleted: true,
          isArchived: true,
          server: { select: { type: true } },
        },
      },
    },
  });

  if (!post || post.isDeleted || post.channel.isDeleted) {
    throw new NotFoundError("Post not found");
  }

  if (post.channel.isArchived) {
    throw new ConflictError(
      "Archived channels are read-only",
      ApiErrorCode.CHANNEL_ARCHIVED,
    );
  }

  return post;
}

async function findReadableChannelForPostsOrThrow(
  channelId: number,
  client: PrismaTransaction = prisma,
) {
  const channel = await client.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      publicId: true,
      serverId: true,
      isDeleted: true,
      isArchived: true,
      isLocked: true,
      server: { select: { type: true } },
    },
  });

  if (!channel || channel.isDeleted) {
    throw new NotFoundError("Channel not found");
  }

  return channel;
}

async function findWritableChannelForPostsOrThrow(
  channelId: number,
  client: PrismaTransaction = prisma,
) {
  const channel = await findReadableChannelForPostsOrThrow(channelId, client);
  if (channel.isArchived) {
    throw new ConflictError(
      "Archived channels are read-only",
      ApiErrorCode.CHANNEL_ARCHIVED,
    );
  }

  return channel;
}

async function lockWritableChannelForPostsOrThrow(
  channelId: number,
  client: PrismaTransaction,
) {
  const rows = await client.$queryRaw<Array<{ id: number }>>`
    SELECT "id"
    FROM "channels"
    WHERE "id" = ${channelId}
      AND "is_deleted" = FALSE
    FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new NotFoundError("Channel not found");
  }
  return findWritableChannelForPostsOrThrow(channelId, client);
}

async function lockWritablePostOrThrow(
  postId: number,
  client: PrismaTransaction,
) {
  const rows = await client.$queryRaw<Array<{ id: number }>>`
    SELECT "id"
    FROM "posts"
    WHERE "id" = ${postId}
      AND "is_deleted" = FALSE
    FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new NotFoundError("Post not found");
  }

  return findWritablePostOrThrow(postId, client);
}

async function assertMembershipOrAdmin(
  serverId: number,
  caller: CallerInfo,
  client: PrismaTransaction = prisma,
) {
  if (caller.userType === "ADMIN") return;

  const membership = await client.serverMembership.findUnique({
    where: { userId_serverId: { userId: caller.id, serverId } },
  });

  if (!membership) {
    throw new ForbiddenError("You are not a member of this server");
  }
}

function toPublicUser<T extends { id: number }>(user: T): Omit<T, "id"> {
  const { id: _id, ...publicUser } = user;
  return publicUser;
}

function toPublicPost<T extends {
  id: number;
  author: { id: number };
  pinner?: ({ id: number } | null);
}>(post: T): Omit<T, "id" | "author" | "pinner"> & {
  author: Omit<T["author"], "id">;
  pinner?: Omit<NonNullable<T["pinner"]>, "id"> | null;
} {
  const { id: _id, author, pinner, ...publicPost } = post;
  return {
    ...publicPost,
    author: toPublicUser(author),
    ...(pinner === undefined
      ? {}
      : { pinner: pinner === null ? null : toPublicUser(pinner) }),
  };
}

/**
 * Resolve role badges for a set of author user IDs within a server.
 * Returns a map from userId → badge name list.
 */
async function resolveAuthorBadges(
  serverId: number,
  serverType: ServerType,
  authorUserIds: number[],
): Promise<Map<number, string[]>> {
  const badgeMap = new Map<number, string[]>();

  if (authorUserIds.length === 0) {
    return badgeMap;
  }

  const uniqueIds = [...new Set(authorUserIds)];

  const addBadge = (userId: number, badge: string) => {
    const current = badgeMap.get(userId) ?? [];
    if (current.includes(badge)) {
      return;
    }
    current.push(badge);
    badgeMap.set(userId, current);
  };

  if (serverType === "DEPARTMENT") {
    const [department, programs, moderators] = await Promise.all([
      prisma.department.findUnique({
        where: { serverId },
        select: { hodId: true },
      }),
      prisma.program.findMany({
        where: { department: { serverId } },
        select: { programDirectorId: true },
      }),
      prisma.userRoleAssignment.findMany({
        where: {
          AND: [activePlatformRoleAssignmentWhere(), { serverId, userId: { in: uniqueIds } }],
        },
        select: { userId: true, role: { select: { name: true } } },
      }),
    ]);

    if (department?.hodId && uniqueIds.includes(department.hodId)) {
      addBadge(department.hodId, "hod");
    }
    for (const program of programs) {
      if (
        program.programDirectorId &&
        uniqueIds.includes(program.programDirectorId)
      ) {
        addBadge(program.programDirectorId, "program_director");
      }
    }
    for (const mod of moderators) {
      addBadge(
        mod.userId,
        mod.role.name,
      );
    }
  } else if (serverType === "CLASS") {
    const [classRecord, moderators] = await Promise.all([
      prisma.class.findUnique({
        where: { serverId },
        select: { crId: true },
      }),
      prisma.userRoleAssignment.findMany({
        where: {
          AND: [activePlatformRoleAssignmentWhere(), { serverId, userId: { in: uniqueIds } }],
        },
        select: { userId: true, role: { select: { name: true } } },
      }),
    ]);

    if (classRecord?.crId && uniqueIds.includes(classRecord.crId)) {
      addBadge(classRecord.crId, "cr");
    }
    for (const mod of moderators) {
      addBadge(
        mod.userId,
        mod.role.name,
      );
    }
  } else if (serverType === "SOCIETY") {
    const [society, moderators] = await Promise.all([
      prisma.society.findUnique({
        where: { serverId },
        select: {
          president: { select: { user: { select: { id: true } } } },
          convenor: { select: { user: { select: { id: true } } } },
        },
      }),
      prisma.userRoleAssignment.findMany({
        where: {
          AND: [activePlatformRoleAssignmentWhere(), { serverId, userId: { in: uniqueIds } }],
        },
        select: { userId: true, role: { select: { name: true } } },
      }),
    ]);

    if (society) {
      const presidentUserId = society.president.user.id;
      const convenorUserId = society.convenor.user.id;

      if (uniqueIds.includes(presidentUserId)) {
        addBadge(presidentUserId, "president");
      }
      if (uniqueIds.includes(convenorUserId)) {
        addBadge(convenorUserId, "convenor");
      }
    }
    for (const mod of moderators) {
      addBadge(
        mod.userId,
        mod.role.name,
      );
    }
  }

  return badgeMap;
}

async function uploadAttachmentImages(
  files: UploadedFile[],
): Promise<CloudinaryUpload[]> {
  const results = await Promise.allSettled(
    files.map((file) =>
      cloudinaryService.uploadImage(file.buffer, "post-attachments"),
    ),
  );
  const uploaded = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const failure = results.find((result) => result.status === "rejected");
  if (failure) {
    await cleanupCloudinaryUploads(uploaded);
    throw failure.reason;
  }
  return uploaded;
}

async function createAttachmentRecords(
  client: PrismaTransaction,
  postId: number,
  files: UploadedFile[],
  uploaded: CloudinaryUpload[],
): Promise<void> {
  await client.postAttachment.createMany({
    data: uploaded.map(({ url }, index) => ({
      postId,
      fileUrl: url,
      fileType: files[index].mimetype,
      fileSize: files[index].size,
    })),
  });
}

async function uploadAttachments(
  postId: number,
  channelId: number,
  serverId: number,
  files: UploadedFile[],
  caller: CallerInfo,
  enforceLimit = false,
): Promise<void> {
  const uploaded = await uploadAttachmentImages(files);
  try {
    await prisma.$transaction(async (tx) => {
      await assertServerAcceptsWrites(serverId, tx);
      await lockWritableChannelForPostsOrThrow(channelId, tx);
      const post = await lockWritablePostOrThrow(postId, tx);
      if (post.authorId !== caller.id) {
        throw new ForbiddenError("Only the author can add attachments to this post");
      }
      await assertMembershipOrAdmin(serverId, caller, tx);
      if (enforceLimit) {
        const existingCount = await tx.postAttachment.count({ where: { postId } });
        if (existingCount + files.length > MAX_ATTACHMENTS) {
          throw new ValidationError(
            `Cannot exceed ${MAX_ATTACHMENTS} attachments per post (currently ${existingCount})`,
          );
        }
      }
      await createAttachmentRecords(tx, postId, files, uploaded);
    });
  } catch (error) {
    await cleanupCloudinaryUploads(uploaded);
    throw error;
  }
}

// ─── Exported Helpers ──────────────────────────────────────────────────────

/**
 * Resolve serverId from a post ID. Used by the authorize middleware
 * as an async IdResolver for post-level endpoints.
 */
export async function resolveServerIdFromPost(postId: number): Promise<number> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      isDeleted: true,
      channel: { select: { serverId: true, isDeleted: true } },
    },
  });

  if (!post || post.isDeleted || post.channel.isDeleted) {
    throw new NotFoundError("Post not found");
  }

  return post.channel.serverId;
}

// ─── Service Functions ─────────────────────────────────────────────────────

export async function createPost(
  channelId: number,
  data: CreatePostInput,
  files: UploadedFile[],
  caller: CallerInfo,
) {
  const channel = await findWritableChannelForPostsOrThrow(channelId);

  if (channel.isLocked) {
    throw new ForbiddenError("Channel is locked", ApiErrorCode.CHANNEL_LOCKED);
  }

  await prisma.$transaction((tx) => assertServerAcceptsWrites(channel.serverId, tx));

  // Check posting rights
  const userRoles = caller.userRoles ?? await getUserRoles(caller.id);
  const allowed = await canPostInChannel(
    caller.id,
    caller.userType,
    channelId,
    userRoles,
  );
  if (!allowed) {
    throw new ForbiddenError(
      "You do not have permission to post in this channel",
    );
  }

  const uploaded = files.length > 0 ? await uploadAttachmentImages(files) : [];
  let post;
  try {
    // Serialize the insert and attachment records with society lifecycle transitions.
    post = await prisma.$transaction(async (tx) => {
      await assertServerAcceptsWrites(channel.serverId, tx);
      const lockedChannel = await lockWritableChannelForPostsOrThrow(channelId, tx);
      if (lockedChannel.isLocked) {
        throw new ForbiddenError("Channel is locked", ApiErrorCode.CHANNEL_LOCKED);
      }
      const stillAllowed = await canPostInChannel(
        caller.id,
        caller.userType,
        channelId,
        userRoles,
        tx,
      );
      if (!stillAllowed) {
        throw new ForbiddenError("You do not have permission to post in this channel");
      }
      const created = await tx.post.create({
        data: {
          authorId: caller.id,
          channelId,
          title: data.title,
          content: data.content,
          priority: data.priority ?? "NORMAL",
        },
        select: { id: true },
      });
      if (uploaded.length > 0) {
        await createAttachmentRecords(tx, created.id, files, uploaded);
      }
      return tx.post.findUniqueOrThrow({
        where: { id: created.id },
        select: postDetailSelect,
      });
    });
  } catch (error) {
    await cleanupCloudinaryUploads(uploaded);
    throw error;
  }

  // Resolve author badge
  const badgeMap = await resolveAuthorBadges(
    channel.serverId,
    channel.server.type,
    [post.author.id],
  );

  appEvents.emit(APP_EVENTS.POST_CREATED, {
    postId: post.id,
    channelId,
    serverId: channel.serverId,
    authorId: caller.id,
    title: data.title,
    priority: data.priority ?? "NORMAL",
    serverType: channel.server.type,
  });

  const response = toPublicPost({
    ...post,
    author: {
      ...post.author,
      badges: badgeMap.get(post.author.id) ?? [],
    },
  });

  emitToChannel(channelId, "post:created", {
    channelPublicId: channel.publicId,
    post: response,
  });

  invalidateSystemStatsCache();
  return response;
}

export async function listPosts(
  channelId: number,
  query: ListPostsQuery,
  caller: CallerInfo,
) {
  const channel = await findReadableChannelForPostsOrThrow(channelId);

  await assertMembershipOrAdmin(channel.serverId, caller);

  const { page, limit, skip, take } = parsePagination(query);

  // Build where clause
  const where: Prisma.PostWhereInput = {
    channelId,
    isDeleted: false,
  };

  if (query.search) {
    where.title = { contains: query.search, mode: "insensitive" };
  }

  if (query.priority) {
    where.priority = query.priority;
  }

  if (query.startDate || query.endDate) {
    const createdAt: Record<string, Date> = {};
    if (query.startDate) {
      createdAt.gte =
        query.startDate instanceof Date
          ? query.startDate
          : new Date(query.startDate);
    }
    if (query.endDate) {
      createdAt.lte =
        query.endDate instanceof Date ? query.endDate : new Date(query.endDate);
    }
    where.createdAt = createdAt;
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: postListSelect,
      skip,
      take,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    }),
    prisma.post.count({ where }),
  ]);

  // Resolve author badges for all posts in the page
  const authorIds = posts.map((p) => p.author.id);
  const badgeMap = await resolveAuthorBadges(
    channel.serverId,
    channel.server.type,
    authorIds,
  );

  const data = posts.map((p) => toPublicPost({
    ...p,
    author: {
      ...p.author,
      badges: badgeMap.get(p.author.id) ?? [],
    },
  }));

  return {
    data,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getPost(postId: number, caller: CallerInfo) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      ...postDetailSelect,
      channelId: true,
      channel: {
        select: {
          serverId: true,
          publicId: true,
          isDeleted: true,
          isArchived: true,
          server: { select: { type: true } },
        },
      },
      isDeleted: true,
    },
  });

  if (!post || post.isDeleted || post.channel.isDeleted) {
    throw new NotFoundError("Post not found");
  }

  await assertMembershipOrAdmin(post.channel.serverId, caller);

  const badgeMap = await resolveAuthorBadges(
    post.channel.serverId,
    post.channel.server.type,
    [post.author.id],
  );

  // Strip internal fields from response
  const {
    channelId: _channelId,
    channel: _channel,
    isDeleted: _isDeleted,
    ...postData
  } = post;

  return toPublicPost({
    ...postData,
    author: {
      ...postData.author,
      badges: badgeMap.get(postData.author.id) ?? [],
    },
  });
}

export async function updatePost(
  postId: number,
  data: UpdatePostInput,
  caller: CallerInfo,
) {
  const post = await findWritablePostOrThrow(postId);

  // Only the author can edit
  if (post.authorId !== caller.id) {
    throw new ForbiddenError("Only the author can edit this post");
  }

  // Check 24-hour edit window
  const editWindowMs = 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - post.createdAt.getTime();
  if (elapsed > editWindowMs) {
    throw new ForbiddenError("Edit window has expired", ApiErrorCode.EDIT_WINDOW_EXPIRED);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await assertServerAcceptsWrites(post.channel.serverId, tx);
    await lockWritableChannelForPostsOrThrow(post.channelId, tx);
    const currentPost = await lockWritablePostOrThrow(postId, tx);
    if (currentPost.authorId !== caller.id) {
      throw new ForbiddenError("Only the author can edit this post");
    }
    await assertMembershipOrAdmin(post.channel.serverId, caller, tx);
    const currentElapsed = Date.now() - currentPost.createdAt.getTime();
    if (currentElapsed > editWindowMs) {
      throw new ForbiddenError("Edit window has expired", ApiErrorCode.EDIT_WINDOW_EXPIRED);
    }
    return tx.post.update({
      where: { id: postId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        updatedAt: new Date(),
        updatedBy: caller.id,
      },
      select: postDetailSelect,
    });
  });

  // Resolve author badge
  const badgeMap = await resolveAuthorBadges(
    post.channel.serverId,
    post.channel.server.type,
    [updated.author.id],
  );

  const response = toPublicPost({
    ...updated,
    author: {
      ...updated.author,
      badges: badgeMap.get(updated.author.id) ?? [],
    },
  });

  emitToChannel(post.channelId, "post:updated", {
    channelPublicId: post.channel.publicId,
    post: response,
  });

  return response;
}

export async function deletePost(postId: number, caller: CallerInfo) {
  const post = await findWritablePostOrThrow(postId);

  // Only author or admin can delete
  if (post.authorId !== caller.id && caller.userType !== "ADMIN") {
    throw new ForbiddenError("You do not have permission to delete this post");
  }

  const deletedNotifications = await prisma.$transaction(async (tx) => {
    await assertServerAcceptsWrites(post.channel.serverId, tx);
    await lockWritableChannelForPostsOrThrow(post.channelId, tx);
    const currentPost = await lockWritablePostOrThrow(postId, tx);
    if (currentPost.authorId !== caller.id && caller.userType !== "ADMIN") {
      throw new ForbiddenError("You do not have permission to delete this post");
    }
    await assertMembershipOrAdmin(post.channel.serverId, caller, tx);
    await tx.post.update({
      where: { id: postId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: caller.id,
      },
    });

    const notifications = await tx.notification.findMany({
      where: { postId },
      select: { id: true, userId: true },
    });

    if (notifications.length > 0) {
      await tx.notification.deleteMany({ where: { postId } });
    }

    return notifications;
  });

  await emitPostNotificationsDeleted(post.publicId, deletedNotifications);

  emitToChannel(post.channelId, "post:deleted", {
    channelPublicId: post.channel.publicId,
    postPublicId: post.publicId,
  });

  invalidateSystemStatsCache();
  return null;
}

export async function pinPost(
  postId: number,
  data: PinPostInput,
  caller: CallerInfo,
) {
  const post = await findWritablePostOrThrow(postId);

  const updated = await prisma.$transaction(async (tx) => {
    await assertServerAcceptsWrites(post.channel.serverId, tx);
    await lockWritableChannelForPostsOrThrow(post.channelId, tx);
    await lockWritablePostOrThrow(postId, tx);
    return tx.post.update({
      where: { id: postId },
      data: data.isPinned
        ? { isPinned: true, pinnedBy: caller.id, pinnedAt: new Date() }
        : { isPinned: false, pinnedBy: null, pinnedAt: null },
      select: postDetailSelect,
    });
  });

  const badgeMap = await resolveAuthorBadges(
    post.channel.serverId,
    post.channel.server.type,
    [updated.author.id],
  );

  const response = toPublicPost({
    ...updated,
    author: {
      ...updated.author,
      badges: badgeMap.get(updated.author.id) ?? [],
    },
  });

  emitToChannel(post.channelId, "post:pinned", {
    channelPublicId: post.channel.publicId,
    post: response,
  });

  return response;
}

export async function addAttachments(
  postId: number,
  files: UploadedFile[],
  caller: CallerInfo,
) {
  if (files.length === 0) {
    throw new ValidationError("At least one attachment is required");
  }

  const post = await findWritablePostOrThrow(postId);

  // Only the author can add attachments
  if (post.authorId !== caller.id) {
    throw new ForbiddenError(
      "Only the author can add attachments to this post",
    );
  }

  // Reject former members before invoking the external upload provider. The
  // transaction below repeats this check to cover concurrent membership changes.
  await assertMembershipOrAdmin(post.channel.serverId, caller);

  // Check total attachment count
  const existingCount = await prisma.postAttachment.count({
    where: { postId },
  });

  if (existingCount + files.length > MAX_ATTACHMENTS) {
    throw new ValidationError(
      `Cannot exceed ${MAX_ATTACHMENTS} attachments per post (currently ${existingCount})`,
    );
  }

  await uploadAttachments(
    postId,
    post.channelId,
    post.channel.serverId,
    files,
    caller,
    true,
  );

  // Return updated post with attachments
  const updated = await prisma.post.findUnique({
    where: { id: postId },
    select: postDetailSelect,
  });

  if (!updated) {
    throw new NotFoundError("Post not found");
  }

  const badgeMap = await resolveAuthorBadges(
    post.channel.serverId,
    post.channel.server.type,
    [updated.author.id],
  );

  const response = toPublicPost({
    ...updated,
    author: {
      ...updated.author,
      badges: badgeMap.get(updated.author.id) ?? [],
    },
  });

  emitToChannel(post.channelId, "post:updated", {
    channelPublicId: post.channel.publicId,
    post: response,
  });

  return response;
}
