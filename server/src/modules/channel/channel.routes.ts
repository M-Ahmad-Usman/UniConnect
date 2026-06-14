import type { Request } from "express";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getResolvedChannelTarget,
  resolveChannelTarget,
} from "../../middleware/resolveCommunicationTarget.js";
import { validate } from "../../middleware/validate.js";
import { channelPublicIdParamSchema, updateChannelSchema } from "./channel.schema.js";
import {
  handleUpdateChannel,
  handleLockChannel,
  handleUnlockChannel,
  handleDeleteChannel,
} from "./channel.controller.js";

const router = Router();

// ─── Async Server ID Resolver ──────────────────────────────────────────────

const serverIdFromChannel = (req: Request) => getResolvedChannelTarget(req).serverId;
const channelIdFromTarget = (req: Request) => getResolvedChannelTarget(req).id;

// ─── Channel Endpoints ─────────────────────────────────────────────────────

router.patch(
  "/:publicId",
  authenticate,
  validate(updateChannelSchema),
  resolveChannelTarget,
  authorize({
    permission: "create:channel",
    serverIdFrom: serverIdFromChannel,
    channelIdFrom: channelIdFromTarget,
  }),
  handleUpdateChannel
);

router.patch(
  "/:publicId/lock",
  authenticate,
  validate(channelPublicIdParamSchema),
  resolveChannelTarget,
  authorize({
    permission: "lock:channel",
    serverIdFrom: serverIdFromChannel,
    channelIdFrom: channelIdFromTarget,
  }),
  handleLockChannel
);

router.patch(
  "/:publicId/unlock",
  authenticate,
  validate(channelPublicIdParamSchema),
  resolveChannelTarget,
  authorize({
    permission: "lock:channel",
    serverIdFrom: serverIdFromChannel,
    channelIdFrom: channelIdFromTarget,
  }),
  handleUnlockChannel
);

router.delete(
  "/:publicId",
  authenticate,
  validate(channelPublicIdParamSchema),
  resolveChannelTarget,
  authorize({
    permission: "delete:channel",
    serverIdFrom: serverIdFromChannel,
    channelIdFrom: channelIdFromTarget,
  }),
  handleDeleteChannel
);

export default router;
