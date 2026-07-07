import { z } from "zod";
import { publicIdSchema } from "../../shared/ids/index.js";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

const userTypeEnum = z.enum(["STUDENT", "TEACHER", "STAFF"]);
const creatableUserTypeEnum = z.enum(["STUDENT", "TEACHER", "STAFF"]);
const genderEnum = z.enum(["MALE", "FEMALE"]);
const userStatusEnum = z.enum(["ACTIVE", "SUSPENDED"]);
const lifecycleReasonSchema = z.string().trim().min(1).max(500).optional();
const rollNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{2}-NTU-[A-Z]{2,5}-\d{3,5}$/, {
    error: "Roll number must use NTU format, e.g. 22-NTU-CS-1184",
  });

// ─── Create User ───────────────────────────────────────────────────────────

export const createUserBodySchema = z
  .object({
    fullName: z.string().min(1, { error: "Full name is required" }).max(100),
    email: z.email({ error: "Invalid email address" }),
    phone: z.string().min(1, { error: "Phone is required" }).max(20),
    gender: genderEnum,
    userType: creatableUserTypeEnum,
    departmentId: z.number().int().positive().optional(),
    classPublicId: publicIdSchema.optional(),
    rollNumber: rollNumberSchema.optional(),
    designation: z.string().min(1, { error: "Designation is required" }).max(100).optional(),
  })
  .refine((data) => data.userType === "STAFF" || data.departmentId !== undefined, {
    error: "departmentId is required for STUDENT and TEACHER",
    path: ["departmentId"],
  })
  .refine((data) => data.userType !== "STUDENT" || data.classPublicId !== undefined, {
    error: "classPublicId is required for STUDENT",
    path: ["classPublicId"],
  })
  .refine((data) => data.userType !== "STUDENT" || data.rollNumber !== undefined, {
    error: "rollNumber is required for STUDENT",
    path: ["rollNumber"],
  })
  .refine((data) => data.userType !== "TEACHER" || data.designation !== undefined, {
    error: "designation is required for TEACHER",
    path: ["designation"],
  });

export const createUserSchema = {
  body: createUserBodySchema,
};

// ─── Update Profile ────────────────────────────────────────────────────────

export const updateProfileSchema = {
  body: z.object({
    bio: z.string().max(500, { error: "Bio must be at most 500 characters" }).optional(),
  }),
};

// ─── Users List ────────────────────────────────────────────────────────────

export const listUsersSchema = {
  query: paginationQuerySchema.extend({
    userType: userTypeEnum.optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    status: userStatusEnum.optional(),
    lifecycle: z.enum(["live", "deleted", "all"]).optional(),
    search: z.string().trim().max(100).optional(),
  }),
};

// ─── Params ────────────────────────────────────────────────────────────────

export const userPublicIdParamSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
};

export const updateUserStatusSchema = {
  params: userPublicIdParamSchema.params,
  body: z.object({
    status: userStatusEnum,
    reason: lifecycleReasonSchema,
  }),
};

export const userLifecycleReasonSchema = {
  params: userPublicIdParamSchema.params,
  body: z.preprocess(
    (value) => value ?? {},
    z.object({
      reason: lifecycleReasonSchema,
    }),
  ),
};
