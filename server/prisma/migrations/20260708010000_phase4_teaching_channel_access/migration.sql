-- Phase 4: Teaching assignments grant direct course-channel access.
-- This migration backfills every existing TEACHES row to a concrete course
-- channel before making teaches.channel_id non-null. Prisma cannot represent
-- the partial channel uniqueness rule, so that index remains SQL-only.

ALTER TABLE "teaches"
ADD COLUMN "channel_id" INTEGER,
ADD COLUMN "assigned_by" INTEGER,
ADD COLUMN "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Keep one non-deleted course channel per class server/course pair. If old data
-- somehow contains duplicates, soft-delete the higher ids before creating the
-- SQL-only uniqueness guard.
WITH duplicate_course_channels AS (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "server_id", "course_id"
        ORDER BY "is_archived" ASC, "created_at" ASC, "id" ASC
      ) AS row_number
    FROM "channels"
    WHERE "type" = 'course'::"channel_type"
      AND "course_id" IS NOT NULL
      AND "is_deleted" = FALSE
  ) ranked
  WHERE ranked.row_number > 1
)
UPDATE "channels"
SET
  "is_deleted" = TRUE,
  "deleted_at" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM duplicate_course_channels);

-- Create missing course channels for already-assigned class courses.
INSERT INTO "channels" (
  "server_id",
  "name",
  "type",
  "course_id",
  "is_auto_created",
  "is_locked",
  "created_at"
)
SELECT
  cls."server_id",
  course."code",
  'course'::"channel_type",
  teaches."course_id",
  TRUE,
  FALSE,
  CURRENT_TIMESTAMP
FROM "teaches"
INNER JOIN "classes" AS cls ON cls."id" = teaches."class_id"
INNER JOIN "courses" AS course ON course."id" = teaches."course_id"
WHERE NOT EXISTS (
  SELECT 1
  FROM "channels" AS existing
  WHERE existing."server_id" = cls."server_id"
    AND existing."course_id" = teaches."course_id"
    AND existing."type" = 'course'::"channel_type"
    AND existing."is_deleted" = FALSE
);

-- Link every teaching assignment to its class server's course channel.
UPDATE "teaches"
SET "channel_id" = linked_channel."id"
FROM (
  SELECT DISTINCT ON (teaches."teacher_id", teaches."course_id", teaches."class_id")
    teaches."teacher_id",
    teaches."course_id",
    teaches."class_id",
    channel."id"
  FROM "teaches"
  INNER JOIN "classes" AS cls ON cls."id" = teaches."class_id"
  INNER JOIN "channels" AS channel
    ON channel."server_id" = cls."server_id"
   AND channel."course_id" = teaches."course_id"
   AND channel."type" = 'course'::"channel_type"
   AND channel."is_deleted" = FALSE
  ORDER BY
    teaches."teacher_id",
    teaches."course_id",
    teaches."class_id",
    channel."is_archived" ASC,
    channel."created_at" ASC,
    channel."id" ASC
) AS linked_channel
WHERE "teaches"."teacher_id" = linked_channel."teacher_id"
  AND "teaches"."course_id" = linked_channel."course_id"
  AND "teaches"."class_id" = linked_channel."class_id";

-- Assigned course channels are available by default after backfill.
UPDATE "channels"
SET
  "is_archived" = FALSE,
  "archived_at" = NULL,
  "archived_by" = NULL,
  "is_locked" = FALSE,
  "locked_at" = NULL,
  "locked_by" = NULL
WHERE "id" IN (
  SELECT DISTINCT "channel_id"
  FROM "teaches"
  WHERE "channel_id" IS NOT NULL
);

-- Existing unassigned course channels stay visible but locked until a teacher
-- is assigned.
UPDATE "channels"
SET
  "is_locked" = TRUE,
  "locked_at" = COALESCE("locked_at", CURRENT_TIMESTAMP)
WHERE "type" = 'course'::"channel_type"
  AND "is_deleted" = FALSE
  AND "is_archived" = FALSE
  AND NOT EXISTS (
    SELECT 1
    FROM "teaches"
    WHERE "teaches"."channel_id" = "channels"."id"
  );

-- Remove old auto-joined teacher class memberships that were used only to make
-- teaching access work before direct course-channel authorization.
DELETE FROM "server_memberships" AS membership
USING "users" AS teacher, "classes" AS cls
WHERE membership."user_id" = teacher."id"
  AND membership."server_id" = cls."server_id"
  AND teacher."user_type" = 'Teacher'::"user_type"
  AND membership."is_auto_joined" = TRUE
  AND EXISTS (
    SELECT 1
    FROM "teaches"
    WHERE "teaches"."teacher_id" = teacher."id"
      AND "teaches"."class_id" = cls."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "user_role_assignments" AS assignment
    WHERE assignment."user_id" = teacher."id"
      AND assignment."server_id" = membership."server_id"
      AND assignment."revoked_at" IS NULL
      AND (
        assignment."expires_at" IS NULL
        OR assignment."expires_at" > CURRENT_TIMESTAMP
      )
  );

ALTER TABLE "teaches"
ALTER COLUMN "channel_id" SET NOT NULL;

ALTER TABLE "channels"
ADD CONSTRAINT "channels_id_course_id_key"
UNIQUE ("id", "course_id");

ALTER TABLE "teaches"
ADD CONSTRAINT "teaches_channel_id_fkey"
FOREIGN KEY ("channel_id") REFERENCES "channels"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "teaches"
ADD CONSTRAINT "teaches_assigned_by_fkey"
FOREIGN KEY ("assigned_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teaches"
ADD CONSTRAINT "teaches_channel_course_fkey"
FOREIGN KEY ("channel_id", "course_id") REFERENCES "channels"("id", "course_id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "teaches_channel_id_idx"
ON "teaches"("channel_id");

CREATE INDEX "teaches_assigned_at_idx"
ON "teaches"("assigned_at");

CREATE UNIQUE INDEX "channels_active_course_channel_key"
ON "channels"("server_id", "course_id")
WHERE "type" = 'course'::"channel_type"
  AND "course_id" IS NOT NULL
  AND "is_deleted" = FALSE;
