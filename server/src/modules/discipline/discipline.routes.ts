import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { createDisciplineSchema } from "./discipline.schema.js";
import { handleCreateDiscipline, handleListDisciplines } from "./discipline.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(createDisciplineSchema),
  handleCreateDiscipline
);

router.get("/", authenticate, handleListDisciplines);

export default router;
