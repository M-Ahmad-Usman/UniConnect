import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { adminListUsersSchema } from "./admin.schema.js";
import { handleGetSystemStats, handleListAllUsers } from "./admin.controller.js";

const router = Router();

router.get(
  "/stats",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  handleGetSystemStats
);

router.get(
  "/users",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(adminListUsersSchema),
  handleListAllUsers
);

export default router;
