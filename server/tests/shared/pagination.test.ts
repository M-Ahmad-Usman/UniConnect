import { parsePagination, buildPaginationResponse } from "../../src/shared/utils/pagination.js";

describe("Pagination Utility", () => {
  describe("parsePagination", () => {
    it("should return defaults when no params provided", () => {
      const result = parsePagination({});

      expect(result).toEqual({
        page: 1,
        limit: 20,
        skip: 0,
        take: 20,
      });
    });

    it("should parse custom page and limit", () => {
      const result = parsePagination({ page: "3", limit: "10" });

      expect(result).toEqual({
        page: 3,
        limit: 10,
        skip: 20,
        take: 10,
      });
    });

    it("should cap limit at MAX_PAGE_SIZE (50)", () => {
      const result = parsePagination({ page: "1", limit: "100" });

      // When validation fails (limit > 50), falls back to defaults
      expect(result.limit).toBeLessThanOrEqual(50);
    });

    it("should default to page 1 for negative page values", () => {
      const result = parsePagination({ page: "-1", limit: "20" });

      // Negative page fails validation, falls back to defaults
      expect(result.page).toBe(1);
      expect(result.skip).toBe(0);
    });

    it("should default to page 1 for zero page value", () => {
      const result = parsePagination({ page: "0", limit: "20" });

      expect(result.page).toBe(1);
      expect(result.skip).toBe(0);
    });

    it("should calculate correct skip for page 5 with limit 10", () => {
      const result = parsePagination({ page: "5", limit: "10" });

      expect(result.skip).toBe(40);
      expect(result.take).toBe(10);
    });
  });

  describe("buildPaginationResponse", () => {
    it("should return correct pagination metadata", () => {
      const result = buildPaginationResponse(1, 20, 150);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        total: 150,
        totalPages: 8, // ceil(150/20) = 8
      });
    });

    it("should handle zero total items", () => {
      const result = buildPaginationResponse(1, 20, 0);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it("should handle exact division", () => {
      const result = buildPaginationResponse(1, 10, 100);

      expect(result.totalPages).toBe(10);
    });

    it("should round up totalPages for partial last page", () => {
      const result = buildPaginationResponse(1, 20, 41);

      expect(result.totalPages).toBe(3); // ceil(41/20) = 3
    });
  });
});
