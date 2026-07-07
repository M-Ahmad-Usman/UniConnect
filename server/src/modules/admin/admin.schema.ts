import { z } from "zod";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

// ─── Admin User List ───────────────────────────────────────────────────────

export const adminListUsersSchema = {
  query: paginationQuerySchema.extend({
    userType: z.enum(["STUDENT", "TEACHER", "STAFF"]).optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    lifecycle: z.enum(["live", "deleted", "all"]).optional(),
    search: z.string().trim().max(100).optional(),
  }),
};
