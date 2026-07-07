import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { uploadCSV, validateCSVNotBinary } from "../../middleware/upload.js";
import { uploadLimiter } from "../../middleware/rateLimiter.js";
import {
  enrollmentCandidateQuerySchema,
  enrollmentClassPublicIdParamSchema,
  enrollmentCreateClassSchema,
  enrollmentCreateStudentSchema,
  enrollmentDepartmentQuerySchema,
  enrollmentListClassesSchema,
  enrollmentProgramCurriculumSchema,
  enrollmentTransferStudentSchema,
} from "./enrollment.schema.js";
import {
  handleCreateEnrollmentClass,
  handleCreateEnrollmentStudent,
  handleGetEnrollmentBootstrap,
  handleGetEnrollmentClass,
  handleGetEnrollmentCurriculum,
  handleImportEnrollmentStudents,
  handleListEnrollmentClasses,
  handleListEnrollmentClassStudents,
  handleListEnrollmentPrograms,
  handleListEnrollmentTransferCandidates,
  handleTransferEnrollmentStudent,
} from "./enrollment.controller.js";

const router = Router();

router.get("/bootstrap", authenticate, handleGetEnrollmentBootstrap);

router.get(
  "/programs",
  authenticate,
  validate(enrollmentDepartmentQuerySchema),
  handleListEnrollmentPrograms
);

router.get(
  "/programs/:programId/curriculum",
  authenticate,
  validate(enrollmentProgramCurriculumSchema),
  handleGetEnrollmentCurriculum
);

router.get(
  "/classes",
  authenticate,
  validate(enrollmentListClassesSchema),
  handleListEnrollmentClasses
);

router.post(
  "/classes",
  authenticate,
  validate(enrollmentCreateClassSchema),
  handleCreateEnrollmentClass
);

router.get(
  "/classes/:publicId",
  authenticate,
  validate(enrollmentClassPublicIdParamSchema),
  handleGetEnrollmentClass
);

router.get(
  "/classes/:publicId/students",
  authenticate,
  validate(enrollmentCandidateQuerySchema),
  handleListEnrollmentClassStudents
);

router.get(
  "/classes/:publicId/transfer-candidates",
  authenticate,
  validate(enrollmentCandidateQuerySchema),
  handleListEnrollmentTransferCandidates
);

router.post(
  "/classes/:publicId/transfers",
  authenticate,
  validate(enrollmentTransferStudentSchema),
  handleTransferEnrollmentStudent
);

router.post(
  "/students",
  authenticate,
  validate(enrollmentCreateStudentSchema),
  handleCreateEnrollmentStudent
);

router.post(
  "/students/import",
  authenticate,
  uploadLimiter,
  uploadCSV,
  validateCSVNotBinary,
  handleImportEnrollmentStudents
);

export default router;
