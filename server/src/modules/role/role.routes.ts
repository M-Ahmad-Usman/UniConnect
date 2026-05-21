import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  assignRoleSchema,
  assignableChannelsSchema,
  assignableScopesSchema,
  assignableUsersSchema,
  revokeRoleSchema,
  getUserRolesSchema,
  revokableRolesSchema,
} from "./role.schema.js";
import {
  handleAssignRole,
  handleGetAssignableRoles,
  handleListAssignableChannels,
  handleListAssignableScopes,
  handleListAssignableUsers,
  handleListRevokableRoles,
  handleRevokeRole,
  handleGetUserRoles,
} from "./role.controller.js";

const router = Router();

// ─── Role Management ───────────────────────────────────────────────────────

router.get(
  "/assignable",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  handleGetAssignableRoles
);

router.get(
  "/assignable-scopes",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(assignableScopesSchema),
  handleListAssignableScopes
);

router.get(
  "/assignable-channels",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(assignableChannelsSchema),
  handleListAssignableChannels
);

router.get(
  "/assignable-users",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(assignableUsersSchema),
  handleListAssignableUsers
);

router.get(
  "/revokable",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(revokableRolesSchema),
  handleListRevokableRoles
);

router.post(
  "/assign",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(assignRoleSchema),
  handleAssignRole
);

router.post(
  "/revoke",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER", "STUDENT"] }),
  validate(revokeRoleSchema),
  handleRevokeRole
);

router.get(
  "/users/:id",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(getUserRolesSchema),
  handleGetUserRoles
);

export default router;
