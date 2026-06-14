import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { createDisciplineSchema, updateDisciplineSchema } from "./discipline.schema.js";
import {
  handleCreateDiscipline,
  handleListDisciplines,
  handleUpdateDiscipline,
} from "./discipline.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(createDisciplineSchema),
  handleCreateDiscipline
);

router.get("/", authenticate, handleListDisciplines);

router.patch(
  "/:id",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(updateDisciplineSchema),
  handleUpdateDiscipline
);

export default router;
