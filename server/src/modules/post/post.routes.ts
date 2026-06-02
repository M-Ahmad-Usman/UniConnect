import type { Request } from "express";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getResolvedPostTarget,
  resolveChannelTarget,
  resolvePostTarget,
} from "../../middleware/resolveCommunicationTarget.js";
import { validate } from "../../middleware/validate.js";
import { uploadPostAttachments, validateImageMagicBytes } from "../../middleware/upload.js";
import { uploadLimiter } from "../../middleware/rateLimiter.js";
import {
  createPostSchema,
  listPostsSchema,
  postPublicIdParamSchema,
  updatePostSchema,
  pinPostSchema,
} from "./post.schema.js";
import {
  handleCreatePost,
  handleListPosts,
  handleGetPost,
  handleUpdatePost,
  handleDeletePost,
  handlePinPost,
  handleAddAttachments,
} from "./post.controller.js";

// ─── Async Server ID Resolver ──────────────────────────────────────────────

const serverIdFromPost = (req: Request) => getResolvedPostTarget(req).serverId;
const channelIdFromPost = (req: Request) => getResolvedPostTarget(req).channelId;

// ─── Channel-Scoped Post Routes (mounted under /api/channels) ──────────────

export const channelPostRoutes = Router();

channelPostRoutes.post(
  "/:publicId/posts",
  authenticate,
  resolveChannelTarget,
  uploadLimiter,
  uploadPostAttachments,
  validateImageMagicBytes,
  validate(createPostSchema),
  handleCreatePost
);

channelPostRoutes.get(
  "/:publicId/posts",
  authenticate,
  validate(listPostsSchema),
  resolveChannelTarget,
  handleListPosts
);

// ─── Post-Scoped Routes (mounted under /api/posts) ─────────────────────────

export const postRoutes = Router();

postRoutes.get(
  "/:publicId",
  authenticate,
  validate(postPublicIdParamSchema),
  resolvePostTarget,
  handleGetPost
);

postRoutes.patch(
  "/:publicId",
  authenticate,
  validate(updatePostSchema),
  resolvePostTarget,
  handleUpdatePost
);

postRoutes.delete(
  "/:publicId",
  authenticate,
  validate(postPublicIdParamSchema),
  resolvePostTarget,
  handleDeletePost
);

postRoutes.patch(
  "/:publicId/pin",
  authenticate,
  validate(pinPostSchema),
  resolvePostTarget,
  authorize({
    permission: "lock:channel",
    serverIdFrom: serverIdFromPost,
    channelIdFrom: channelIdFromPost,
  }),
  handlePinPost
);

postRoutes.post(
  "/:publicId/attachments",
  authenticate,
  validate(postPublicIdParamSchema),
  resolvePostTarget,
  uploadLimiter,
  uploadPostAttachments,
  validateImageMagicBytes,
  handleAddAttachments
);
