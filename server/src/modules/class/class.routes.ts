import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createClassSchema,
  listClassesSchema,
  classIdParamSchema,
  assignCourseSchema,
  listClassCoursesSchema,
  removeCourseSchema,
} from "./class.schema.js";
import {
  handleCreateClass,
  handleListClasses,
  handleGetClass,
  handleAssignCourse,
  handleListClassCourses,
  handleRemoveCourse,
} from "./class.controller.js";

const router = Router();

// ─── Class Routes ──────────────────────────────────────────────────────────

router.post(
  "/",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(createClassSchema),
  handleCreateClass
);

router.get("/", authenticate, validate(listClassesSchema), handleListClasses);

router.get(
  "/:id",
  authenticate,
  validate(classIdParamSchema),
  handleGetClass
);

// ─── Course Assignment Routes ──────────────────────────────────────────────

router.post(
  "/:id/courses",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(assignCourseSchema),
  handleAssignCourse
);

router.get(
  "/:id/courses",
  authenticate,
  validate(listClassCoursesSchema),
  handleListClassCourses
);

router.delete(
  "/:id/courses/:courseId",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(removeCourseSchema),
  handleRemoveCourse
);

export default router;
