import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  listServersSchema,
  serverIdParamSchema,
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
} from "./server.controller.js";

const router = Router();

// ─── Server Endpoints ──────────────────────────────────────────────────────

router.get(
  "/",
  authenticate,
  validate(listServersSchema),
  handleListServers
);

router.get(
  "/:id",
  authenticate,
  validate(serverIdParamSchema),
  handleGetServer
);

router.get(
  "/:id/channels",
  authenticate,
  validate(listServerChannelsSchema),
  handleListServerChannels
);

router.get(
  "/:id/members",
  authenticate,
  validate(listServerMembersSchema),
  handleListServerMembers
);

// ─── Channel Creation ──────────────────────────────────────────────────────

router.post(
  "/:id/channels",
  authenticate,
  validate(createChannelSchema),
  authorize({ permission: "create:channel", serverIdFrom: "id" }),
  handleCreateChannel
);

export default router;
