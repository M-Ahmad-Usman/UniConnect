import type { Request } from "express";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { uploadPostAttachments, validateImageMagicBytes } from "../../middleware/upload.js";
import { uploadLimiter } from "../../middleware/rateLimiter.js";
import {
  createPostSchema,
  listPostsSchema,
  postIdParamSchema,
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
import { resolveServerIdFromPost } from "./post.service.js";

// ─── Async Server ID Resolver ──────────────────────────────────────────────

const serverIdFromPost = async (req: Request) => {
  const postId = Number(req.params.id);
  return resolveServerIdFromPost(postId);
};

// ─── Channel-Scoped Post Routes (mounted under /api/channels) ──────────────

export const channelPostRoutes = Router();

channelPostRoutes.post(
  "/:id/posts",
  authenticate,
  uploadLimiter,
  uploadPostAttachments,
  validateImageMagicBytes,
  validate(createPostSchema),
  handleCreatePost
);

channelPostRoutes.get(
  "/:id/posts",
  authenticate,
  validate(listPostsSchema),
  handleListPosts
);

// ─── Post-Scoped Routes (mounted under /api/posts) ─────────────────────────

export const postRoutes = Router();

postRoutes.get(
  "/:id",
  authenticate,
  validate(postIdParamSchema),
  handleGetPost
);

postRoutes.patch(
  "/:id",
  authenticate,
  validate(updatePostSchema),
  handleUpdatePost
);

postRoutes.delete(
  "/:id",
  authenticate,
  validate(postIdParamSchema),
  handleDeletePost
);

postRoutes.patch(
  "/:id/pin",
  authenticate,
  validate(pinPostSchema),
  authorize({ permission: "lock:channel", serverIdFrom: serverIdFromPost }),
  handlePinPost
);

postRoutes.post(
  "/:id/attachments",
  authenticate,
  validate(postIdParamSchema),
  uploadLimiter,
  uploadPostAttachments,
  validateImageMagicBytes,
  handleAddAttachments
);
