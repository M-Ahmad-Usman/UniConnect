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
  semesterProgressionSchema,
} from "./class.schema.js";
import {
  handleCreateClass,
  handleListClasses,
  handleGetClass,
  handleAssignCourse,
  handleListClassCourses,
  handleRemoveCourse,
  handleAdvanceSemester,
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

// ─── Semester Progression Route ──────────────────────────────────────────

router.post(
  "/:id/semester-progression",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(semesterProgressionSchema),
  handleAdvanceSemester
);

export default router;
