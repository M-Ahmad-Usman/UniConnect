import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  assignableChannelsSchema,
  assignableScopesSchema,
  assignableUsersSchema,
  createPlatformAssignmentSchema,
  createStaffAssignmentSchema,
  getUserRolesSchema,
  listPlatformAssignmentHistorySchema,
  platformAssignmentParamSchema,
  revokableRolesSchema,
  staffAssignmentParamSchema,
  transferAdminSchema,
  updatePlatformAssignmentExpirySchema,
} from "./role.schema.js";
import {
  handleCreatePlatformAssignment,
  handleCreateStaffAssignment,
  handleGetAssignableRoles,
  handleGetUserRoles,
  handleListAssignableChannels,
  handleListAssignableScopes,
  handleListAssignableUsers,
  handleListPlatformAssignmentHistory,
  handleListRevokableRoles,
  handleRevokePlatformAssignment,
  handleRevokeStaffAssignment,
  handleTransferAdmin,
  handleUpdatePlatformAssignmentExpiry,
} from "./role.controller.js";

const router = Router();
const workspaceUserTypes = ["ADMIN", "TEACHER", "STUDENT"];

router.get("/assignable", authenticate, authorize({ userTypes: workspaceUserTypes }), handleGetAssignableRoles);
router.get("/assignable-scopes", authenticate, authorize({ userTypes: workspaceUserTypes }), validate(assignableScopesSchema), handleListAssignableScopes);
router.get("/assignable-channels", authenticate, authorize({ userTypes: workspaceUserTypes }), validate(assignableChannelsSchema), handleListAssignableChannels);
router.get("/assignable-users", authenticate, authorize({ userTypes: workspaceUserTypes }), validate(assignableUsersSchema), handleListAssignableUsers);
router.get("/revokable", authenticate, authorize({ userTypes: workspaceUserTypes }), validate(revokableRolesSchema), handleListRevokableRoles);
router.get("/users/:userPublicId", authenticate, authorize({ userTypes: ["ADMIN", "TEACHER"] }), validate(getUserRolesSchema), handleGetUserRoles);

router.get("/platform-assignments/history", authenticate, authorize({ userTypes: ["ADMIN"] }), validate(listPlatformAssignmentHistorySchema), handleListPlatformAssignmentHistory);
router.post("/platform-assignments", authenticate, authorize({ userTypes: workspaceUserTypes }), validate(createPlatformAssignmentSchema), handleCreatePlatformAssignment);
router.patch("/platform-assignments/:assignmentPublicId/expiry", authenticate, authorize({ userTypes: workspaceUserTypes }), validate(updatePlatformAssignmentExpirySchema), handleUpdatePlatformAssignmentExpiry);
router.delete("/platform-assignments/:assignmentPublicId", authenticate, authorize({ userTypes: workspaceUserTypes }), validate(platformAssignmentParamSchema), handleRevokePlatformAssignment);
router.post("/staff-assignments", authenticate, authorize({ userTypes: ["ADMIN"] }), validate(createStaffAssignmentSchema), handleCreateStaffAssignment);
router.delete("/staff-assignments/:assignmentPublicId", authenticate, authorize({ userTypes: ["ADMIN"] }), validate(staffAssignmentParamSchema), handleRevokeStaffAssignment);
router.post("/admin/transfer", authenticate, authorize({ userTypes: ["ADMIN"] }), validate(transferAdminSchema), handleTransferAdmin);

export default router;
