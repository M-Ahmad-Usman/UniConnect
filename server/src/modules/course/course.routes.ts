import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createCourseSchema,
  listCoursesSchema,
  courseIdParamSchema,
  updateCourseSchema,
  courseDeletionImpactSchema,
} from "./course.schema.js";
import {
  handleCreateCourse,
  handleListCourses,
  handleGetCourseById,
  handleGetCourseDeletionImpact,
  handleUpdateCourse,
} from "./course.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(createCourseSchema),
  handleCreateCourse
);

router.get(
  "/",
  authenticate,
  validate(listCoursesSchema),
  handleListCourses
);

router.get(
  "/:id/deletion-impact",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(courseDeletionImpactSchema),
  handleGetCourseDeletionImpact
);

router.get(
  "/:id",
  authenticate,
  validate(courseIdParamSchema),
  handleGetCourseById
);

router.patch(
  "/:id",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(updateCourseSchema),
  handleUpdateCourse
);

export default router;
