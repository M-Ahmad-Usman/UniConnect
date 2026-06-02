import type { Request } from "express";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getResolvedServerTarget,
  resolveServerTarget,
} from "../../middleware/resolveCommunicationTarget.js";
import { validate } from "../../middleware/validate.js";
import { uploadLimiter } from "../../middleware/rateLimiter.js";
import {
  uploadServerIcon,
  validateImageMagicBytes,
} from "../../middleware/upload.js";
import {
  listServersSchema,
  serverPublicIdParamSchema,
  listServerChannelsSchema,
  listServerMembersSchema,
  createChannelSchema,
} from "./server.schema.js";
import {
  handleListServers,
  handleGetServer,
  handleListServerChannels,
  handleListServerMembers,
  handleCreateChannel,
  handleUpdateServerIcon,
} from "./server.controller.js";

const router = Router();
const resolvedServerId = (req: Request) => getResolvedServerTarget(req).id;

// ─── Server Endpoints ──────────────────────────────────────────────────────

router.get("/", authenticate, validate(listServersSchema), handleListServers);

router.get(
  "/:publicId",
  authenticate,
  validate(serverPublicIdParamSchema),
  resolveServerTarget,
  handleGetServer,
);

router.get(
  "/:publicId/channels",
  authenticate,
  validate(listServerChannelsSchema),
  resolveServerTarget,
  handleListServerChannels,
);

router.get(
  "/:publicId/members",
  authenticate,
  validate(listServerMembersSchema),
  resolveServerTarget,
  handleListServerMembers,
);

// ─── Channel Creation ──────────────────────────────────────────────────────

router.post(
  "/:publicId/channels",
  authenticate,
  validate(createChannelSchema),
  resolveServerTarget,
  authorize({ permission: "create:channel", serverIdFrom: resolvedServerId }),
  handleCreateChannel,
);

router.patch(
  "/:publicId/icon",
  authenticate,
  validate(serverPublicIdParamSchema),
  resolveServerTarget,
  authorize({ permission: "create:channel", serverIdFrom: resolvedServerId }),
  uploadLimiter,
  uploadServerIcon,
  validateImageMagicBytes,
  handleUpdateServerIcon,
);

export default router;
