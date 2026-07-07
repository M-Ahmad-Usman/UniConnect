-- Phase 3: society leadership is university-wide, but only active non-deleted
-- societies reserve their president/convenor. Prisma cannot represent partial
-- unique indexes, so these constraints remain SQL-only.

DROP INDEX IF EXISTS "societies_president_id_key";
DROP INDEX IF EXISTS "societies_convenor_id_key";

CREATE UNIQUE INDEX "societies_active_president_id_key"
ON "societies"("president_id")
WHERE "is_deleted" = false AND "status" = 'active';

CREATE UNIQUE INDEX "societies_active_convenor_id_key"
ON "societies"("convenor_id")
WHERE "is_deleted" = false AND "status" = 'active';
