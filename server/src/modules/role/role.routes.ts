import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  assignRoleSchema,
  revokeRoleSchema,
  getUserRolesSchema,
} from "./role.schema.js";
import {
  handleAssignRole,
  handleRevokeRole,
  handleGetUserRoles,
} from "./role.controller.js";

const router = Router();

// ─── Role Management ───────────────────────────────────────────────────────

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
