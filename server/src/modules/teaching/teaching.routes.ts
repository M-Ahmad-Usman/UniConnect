import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { handleGetMyTeaching } from "./teaching.controller.js";
import { getMyTeachingSchema } from "./teaching.schema.js";

const router = Router();

router.get(
  "/me",
  authenticate,
  authorize({ userTypes: ["TEACHER"] }),
  validate(getMyTeachingSchema),
  handleGetMyTeaching,
);

export default router;
