import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createClassSchema,
  listClassesSchema,
  classIdParamSchema,
  assignCourseSchema,
  classCandidateQuerySchema,
  listClassCoursesSchema,
  removeCourseSchema,
  replaceCourseTeacherSchema,
  semesterProgressionSchema,
  transferStudentSchema,
  graduationSchema,
} from "./class.schema.js";
import {
  handleCreateClass,
  handleListClasses,
  handleGetClass,
  handleAssignCourse,
  handleListClassCourses,
  handleRemoveCourse,
  handleAdvanceSemester,
  handleListClassStudents,
  handleListStudentCandidates,
  handleTransferStudent,
  handleListTeacherCandidates,
  handleReplaceCourseTeacher,
  handleGraduateClass,
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

router.get(
  "/:id/students",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(classCandidateQuerySchema),
  handleListClassStudents
);

router.get(
  "/:id/student-candidates",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(classCandidateQuerySchema),
  handleListStudentCandidates
);

router.post(
  "/:id/students",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(transferStudentSchema),
  handleTransferStudent
);

router.get(
  "/:id/teacher-candidates",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(classCandidateQuerySchema),
  handleListTeacherCandidates
);

router.patch(
  "/:id/courses/:courseId/teacher",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(replaceCourseTeacherSchema),
  handleReplaceCourseTeacher
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

router.post(
  "/:id/graduation",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(graduationSchema),
  handleGraduateClass
);

export default router;
