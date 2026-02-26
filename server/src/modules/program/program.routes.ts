import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { updateProgramSchema } from "./program.schema.js";
import { handleUpdateProgram } from "./program.controller.js";

const router = Router();

router.patch(
  "/:id",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(updateProgramSchema),
  handleUpdateProgram
);

export default router;
