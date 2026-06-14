import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants.js";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationParams {
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Parse pagination query params into Prisma-compatible skip/take.
 */
export function parsePagination(query: {
  page?: unknown;
  limit?: unknown;
}): PaginationParams & { page: number; limit: number } {
  const result = paginationQuerySchema.safeParse(query);

  const page = result.success ? result.data.page : 1;
  const limit = result.success ? result.data.limit : DEFAULT_PAGE_SIZE;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Build the pagination metadata for an API response.
 */
export function buildPaginationResponse(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
