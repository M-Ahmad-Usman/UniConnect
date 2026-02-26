import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { uploadCSV, uploadProfilePicture } from "../../middleware/upload.js";
import {
  createUserSchema,
  listUsersSchema,
  updateProfileSchema,
  userIdParamSchema,
} from "./user.schema.js";
import {
  handleCreateUser,
  handleBulkImport,
  handleGetProfile,
  handleUpdateProfile,
  handleUpdateProfilePicture,
  handleListUsers,
  handleGetUserById,
  handleDeactivateUser,
  handleReactivateUser,
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
  uploadCSV,
  handleBulkImport
);

router.get("/me", authenticate, handleGetProfile);

router.patch("/me", authenticate, validate(updateProfileSchema), handleUpdateProfile);

router.patch(
  "/me/profile-picture",
  authenticate,
  uploadProfilePicture,
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
  "/:id",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(userIdParamSchema),
  handleGetUserById
);

router.patch(
  "/:id/deactivate",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(userIdParamSchema),
  handleDeactivateUser
);

router.patch(
  "/:id/reactivate",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(userIdParamSchema),
  handleReactivateUser
);

export default router;
