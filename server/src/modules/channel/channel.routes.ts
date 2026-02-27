import type { Request } from "express";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { channelIdParamSchema, updateChannelSchema } from "./channel.schema.js";
import {
  handleUpdateChannel,
  handleLockChannel,
  handleUnlockChannel,
  handleDeleteChannel,
} from "./channel.controller.js";
import { resolveServerIdFromChannel } from "./channel.service.js";

const router = Router();

// ─── Async Server ID Resolver ──────────────────────────────────────────────

const serverIdFromChannel = async (req: Request) => {
  const channelId = Number(req.params.id);
  return resolveServerIdFromChannel(channelId);
};

// ─── Channel Endpoints ─────────────────────────────────────────────────────

router.patch(
  "/:id",
  authenticate,
  validate(updateChannelSchema),
  authorize({ permission: "create:channel", serverIdFrom: serverIdFromChannel }),
  handleUpdateChannel
);

router.patch(
  "/:id/lock",
  authenticate,
  validate(channelIdParamSchema),
  authorize({ permission: "lock:channel", serverIdFrom: serverIdFromChannel }),
  handleLockChannel
);

router.patch(
  "/:id/unlock",
  authenticate,
  validate(channelIdParamSchema),
  authorize({ permission: "lock:channel", serverIdFrom: serverIdFromChannel }),
  handleUnlockChannel
);

router.delete(
  "/:id",
  authenticate,
  validate(channelIdParamSchema),
  authorize({ permission: "delete:channel", serverIdFrom: serverIdFromChannel }),
  handleDeleteChannel
);

export default router;
