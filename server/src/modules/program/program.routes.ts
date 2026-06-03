import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  programIdParamSchema,
  listProgramsSchema,
  updateProgramSchema,
  programDeletionImpactSchema,
  getCurriculumSchema,
  addCurriculumSchema,
  removeCurriculumSchema,
  assignProgramDirectorSchema,
} from "./program.schema.js";
import {
  handleListPrograms,
  handleGetProgramById,
  handleGetProgramDeletionImpact,
  handleUpdateProgram,
  handleGetCurriculum,
  handleAddCurriculum,
  handleRemoveCurriculum,
  handleAssignProgramDirector,
  handleRevokeProgramDirector,
} from "./program.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  validate(listProgramsSchema),
  handleListPrograms
);

router.get(
  "/:id/deletion-impact",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(programDeletionImpactSchema),
  handleGetProgramDeletionImpact
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

router.put(
  "/:id/program-director",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(assignProgramDirectorSchema),
  handleAssignProgramDirector
);

router.delete(
  "/:id/program-director",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(programIdParamSchema),
  handleRevokeProgramDirector
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
