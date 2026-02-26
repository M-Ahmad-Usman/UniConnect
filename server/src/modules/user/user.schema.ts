import { z } from "zod";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

const userTypeEnum = z.enum(["STUDENT", "TEACHER", "ADMIN"]);
const genderEnum = z.enum(["MALE", "FEMALE"]);

// ─── Create User ───────────────────────────────────────────────────────────

export const createUserBodySchema = z
  .object({
    fullName: z.string().min(1, { error: "Full name is required" }).max(100),
    email: z.email({ error: "Invalid email address" }),
    phone: z.string().min(1, { error: "Phone is required" }).max(20),
    gender: genderEnum,
    userType: userTypeEnum,
    departmentId: z.number().int().positive().optional(),
    classId: z.number().int().positive().optional(),
    rollNumber: z.number().int().positive().optional(),
    designation: z.string().min(1, { error: "Designation is required" }).max(100).optional(),
  })
  .refine((data) => data.userType === "ADMIN" || data.departmentId !== undefined, {
    error: "departmentId is required for STUDENT and TEACHER",
    path: ["departmentId"],
  })
  .refine((data) => data.userType !== "STUDENT" || data.classId !== undefined, {
    error: "classId is required for STUDENT",
    path: ["classId"],
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
    isActive: z.enum(["true", "false"]).optional(),
  }),
};

// ─── Params ────────────────────────────────────────────────────────────────

export const userIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "User ID must be a positive integer" }),
  }),
};
