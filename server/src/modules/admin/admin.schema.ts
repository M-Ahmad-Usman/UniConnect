import { z } from "zod";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

// ─── Admin User List ───────────────────────────────────────────────────────

export const adminListUsersSchema = {
  query: paginationQuerySchema.extend({
    userType: z.enum(["STUDENT", "TEACHER", "ADMIN"]).optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    isActive: z.enum(["true", "false"]).optional(),
    search: z.string().trim().max(100).optional(),
  }),
};
