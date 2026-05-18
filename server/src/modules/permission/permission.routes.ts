import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { getMyPermissionsSchema } from "./permission.schema.js";
import { handleGetMyPermissions } from "./permission.controller.js";

const router = Router();

router.get("/me", authenticate, validate(getMyPermissionsSchema), handleGetMyPermissions);

export default router;
