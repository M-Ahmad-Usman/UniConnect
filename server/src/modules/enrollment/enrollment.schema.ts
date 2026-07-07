import { z } from "zod";
import { publicIdSchema } from "../../shared/ids/index.js";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";
import { createClassSchema, transferStudentSchema } from "../class/class.schema.js";

const genderEnum = z.enum(["MALE", "FEMALE"]);
const rollNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{2}-NTU-[A-Z]{2,5}-\d{3,5}$/, {
    error: "Roll number must use NTU format, e.g. 22-NTU-CS-1184",
  });

export const enrollmentDepartmentQuerySchema = {
  query: paginationQuerySchema.extend({
    departmentId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().max(100).optional(),
  }),
};

export const enrollmentProgramCurriculumSchema = {
  params: z.object({
    programId: z.coerce.number().int().positive(),
  }),
  query: z.object({
    semesterNumber: z.coerce.number().int().positive().optional(),
    batchYear: z.coerce.number().int().min(2000).max(2100).optional(),
  }),
};

export const enrollmentListClassesSchema = {
  query: paginationQuerySchema.extend({
    departmentId: z.coerce.number().int().positive().optional(),
    programId: z.coerce.number().int().positive().optional(),
    semester: z.coerce.number().int().positive().optional(),
    section: z.enum(["A", "B"]).optional(),
    status: z.enum(["ACTIVE", "GRADUATED", "ALL"]).optional(),
  }),
};

export const enrollmentCreateClassSchema = createClassSchema;

export const enrollmentClassPublicIdParamSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
};

export const enrollmentCandidateQuerySchema = {
  params: enrollmentClassPublicIdParamSchema.params,
  query: z.object({
    search: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
};

export const enrollmentTransferStudentSchema = {
  params: enrollmentClassPublicIdParamSchema.params,
  body: transferStudentSchema.body,
};

export const enrollmentCreateStudentSchema = {
  body: z.object({
    fullName: z.string().trim().min(1).max(100),
    email: z.email(),
    phone: z.string().trim().min(1).max(20),
    gender: genderEnum,
    classPublicId: publicIdSchema,
    rollNumber: rollNumberSchema,
  }),
};

export type EnrollmentCreateStudentInput = z.infer<typeof enrollmentCreateStudentSchema.body>;
