import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  programIdParamSchema,
  listProgramsSchema,
  updateProgramSchema,
  getCurriculumSchema,
  addCurriculumSchema,
  removeCurriculumSchema,
} from "./program.schema.js";
import {
  handleListPrograms,
  handleGetProgramById,
  handleUpdateProgram,
  handleGetCurriculum,
  handleAddCurriculum,
  handleRemoveCurriculum,
} from "./program.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  validate(listProgramsSchema),
  handleListPrograms
);

router.get(
  "/:id",
  authenticate,
  validate(programIdParamSchema),
  handleGetProgramById
);

router.patch(
  "/:id",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(updateProgramSchema),
  handleUpdateProgram
);

// ─── Curriculum Routes ─────────────────────────────────────────────────────

router.get(
  "/:id/curriculum",
  authenticate,
  validate(getCurriculumSchema),
  handleGetCurriculum
);

router.post(
  "/:id/curriculum",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(addCurriculumSchema),
  handleAddCurriculum
);

router.delete(
  "/:id/curriculum/:curriculumId",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(removeCurriculumSchema),
  handleRemoveCurriculum
);

export default router;
