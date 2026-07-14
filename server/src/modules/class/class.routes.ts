import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createClassSchema,
  listClassesSchema,
  classPublicIdParamSchema,
  assignCourseSchema,
  classCandidateQuerySchema,
  listClassCoursesSchema,
  removeCourseSchema,
  replaceCourseTeacherSchema,
  semesterProgressionSchema,
  transferStudentSchema,
  graduationSchema,
  bulkSemesterProgressionSchema,
  assignClassCrSchema,
  classCrParamSchema,
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
  handleAssignClassCr,
  handleRevokeClassCr,
  handleGetClassDeletionImpact,
  handleBulkAdvanceSemester,
} from "./class.controller.js";
import { resolveClassTarget } from "../../middleware/resolveClassTarget.js";

const router = Router();

router.post(
  "/semester-progression/bulk",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(bulkSemesterProgressionSchema),
  handleBulkAdvanceSemester,
);

// ─── Class Routes ──────────────────────────────────────────────────────────

router.post(
  "/",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(createClassSchema),
  handleCreateClass
);

router.get("/", authenticate, validate(listClassesSchema), handleListClasses);

router.get(
  "/:publicId/deletion-impact",
  authenticate,
  authorize({ userTypes: ["ADMIN"] }),
  validate(classPublicIdParamSchema),
  resolveClassTarget,
  handleGetClassDeletionImpact
);

router.get(
  "/:publicId",
  authenticate,
  validate(classPublicIdParamSchema),
  resolveClassTarget,
  handleGetClass
);

router.put(
  "/:publicId/cr",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(assignClassCrSchema),
  handleAssignClassCr
);

router.delete(
  "/:publicId/cr",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(classCrParamSchema),
  handleRevokeClassCr
);

// ─── Course Assignment Routes ──────────────────────────────────────────────

router.post(
  "/:publicId/courses",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(assignCourseSchema),
  resolveClassTarget,
  handleAssignCourse
);

router.get(
  "/:publicId/courses",
  authenticate,
  validate(listClassCoursesSchema),
  resolveClassTarget,
  handleListClassCourses
);

router.get(
  "/:publicId/students",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(classCandidateQuerySchema),
  resolveClassTarget,
  handleListClassStudents
);

router.get(
  "/:publicId/student-candidates",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(classCandidateQuerySchema),
  resolveClassTarget,
  handleListStudentCandidates
);

router.post(
  "/:publicId/students",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(transferStudentSchema),
  resolveClassTarget,
  handleTransferStudent
);

router.get(
  "/:publicId/teacher-candidates",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(classCandidateQuerySchema),
  resolveClassTarget,
  handleListTeacherCandidates
);

router.patch(
  "/:publicId/courses/:courseId/teacher",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(replaceCourseTeacherSchema),
  resolveClassTarget,
  handleReplaceCourseTeacher
);

router.delete(
  "/:publicId/courses/:courseId",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(removeCourseSchema),
  resolveClassTarget,
  handleRemoveCourse
);

// ─── Semester Progression Route ──────────────────────────────────────────

router.post(
  "/:publicId/semester-progression",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(semesterProgressionSchema),
  resolveClassTarget,
  handleAdvanceSemester
);

router.post(
  "/:publicId/graduation",
  authenticate,
  authorize({ userTypes: ["ADMIN", "TEACHER"] }),
  validate(graduationSchema),
  resolveClassTarget,
  handleGraduateClass
);

export default router;
