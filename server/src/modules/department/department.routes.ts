import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createDepartmentSchema,
  departmentIdParamSchema,
  updateDepartmentSchema,
  createProgramSchema,
  listProgramsSchema,
  assignDepartmentHodSchema,
} from "./department.schema.js";
import {
  handleCreateDepartment,
  handleListDepartments,
  handleGetDepartmentById,
  handleUpdateDepartment,
  handleCreateProgram,
  handleListPrograms,
  handleGetDepartmentStats,
  handleAssignDepartmentHod,
  handleRevokeDepartmentHod,
} from "./department.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(createDepartmentSchema),
  handleCreateDepartment
);

router.get("/", authenticate, handleListDepartments);

router.get(
  "/:id/stats",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(departmentIdParamSchema),
  handleGetDepartmentStats
);

router.get(
  "/:id",
  authenticate,
  validate(departmentIdParamSchema),
  handleGetDepartmentById
);

router.patch(
  "/:id",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(updateDepartmentSchema),
  handleUpdateDepartment
);

router.put(
  "/:id/hod",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(assignDepartmentHodSchema),
  handleAssignDepartmentHod
);

router.delete(
  "/:id/hod",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(departmentIdParamSchema),
  handleRevokeDepartmentHod
);

router.post(
  "/:id/programs",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(createProgramSchema),
  handleCreateProgram
);

router.get(
  "/:id/programs",
  authenticate,
  validate(listProgramsSchema),
  handleListPrograms
);

export default router;
