import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { uploadCSV, uploadProfilePicture, validateImageMagicBytes, validateCSVNotBinary } from "../../middleware/upload.js";
import { uploadLimiter } from "../../middleware/rateLimiter.js";
import {
  createUserSchema,
  listUsersSchema,
  updateProfileSchema,
  updateUserStatusSchema,
  userLifecycleReasonSchema,
  userPublicIdParamSchema,
} from "./user.schema.js";
import {
  handleCreateUser,
  handleBulkImport,
  handleGetProfile,
  handleUpdateProfile,
  handleUpdateProfilePicture,
  handleListUsers,
  handleGetUserByPublicId,
  handleGetUserDeletionImpact,
  handleUpdateUserStatus,
  handleDeleteUser,
  handleRestoreUser,
} from "./user.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(createUserSchema),
  handleCreateUser
);

router.post(
  "/bulk-import",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  uploadLimiter,
  uploadCSV,
  validateCSVNotBinary,
  handleBulkImport
);

router.get("/me", authenticate, handleGetProfile);

router.patch("/me", authenticate, validate(updateProfileSchema), handleUpdateProfile);

router.patch(
  "/me/profile-picture",
  authenticate,
  uploadLimiter,
  uploadProfilePicture,
  validateImageMagicBytes,
  handleUpdateProfilePicture
);

router.get(
  "/",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(listUsersSchema),
  handleListUsers
);

router.get(
  "/:publicId",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(userPublicIdParamSchema),
  handleGetUserByPublicId
);

router.get(
  "/:publicId/deletion-impact",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(userPublicIdParamSchema),
  handleGetUserDeletionImpact
);

router.patch(
  "/:publicId/status",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(updateUserStatusSchema),
  handleUpdateUserStatus
);

router.delete(
  "/:publicId",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(userLifecycleReasonSchema),
  handleDeleteUser
);

router.patch(
  "/:publicId/restore",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(userLifecycleReasonSchema),
  handleRestoreUser
);

export default router;
