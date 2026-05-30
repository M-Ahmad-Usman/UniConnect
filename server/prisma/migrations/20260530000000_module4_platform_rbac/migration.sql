-- CreateEnum
CREATE TYPE "platform_role_scope_type" AS ENUM ('server', 'channel');

-- Convert the role lookup into platform-only configuration.
ALTER TABLE "roles" ADD COLUMN "scope_type" "platform_role_scope_type";

UPDATE "roles"
SET "scope_type" = CASE
  WHEN "name" = 'server_moderator' THEN 'server'::"platform_role_scope_type"
  WHEN "name" = 'channel_moderator' THEN 'channel'::"platform_role_scope_type"
END;

DELETE FROM "role_permissions"
WHERE "role_id" IN (
  SELECT "id"
  FROM "roles"
  WHERE "scope_type" IS NULL
);

DELETE FROM "roles"
WHERE "scope_type" IS NULL;

ALTER TABLE "roles" ALTER COLUMN "scope_type" SET NOT NULL;

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "scope_type" "platform_role_scope_type" NOT NULL,
    "server_id" INTEGER NOT NULL,
    "channel_id" INTEGER,
    "assigned_by" INTEGER,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3),
    "revoked_by" INTEGER,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_role_assignments_scope_check" CHECK (
      ("scope_type" = 'server' AND "channel_id" IS NULL) OR
      ("scope_type" = 'channel' AND "channel_id" IS NOT NULL)
    ),
    CONSTRAINT "user_role_assignments_expiry_check" CHECK (
      "expires_at" IS NULL OR "expires_at" > "assigned_at"
    ),
    CONSTRAINT "user_role_assignments_revocation_check" CHECK (
      ("revoked_at" IS NULL AND "revoked_by" IS NULL) OR
      ("revoked_at" IS NOT NULL AND "revoked_at" >= "assigned_at")
    )
);

-- Backfill the legacy moderator data before removing its storage.
INSERT INTO "user_role_assignments" (
  "user_id",
  "role_id",
  "scope_type",
  "server_id",
  "channel_id",
  "assigned_by",
  "assigned_at"
)
SELECT
  assignment."user_id",
  role."id",
  CASE
    WHEN assignment."scope_type" = 'server' THEN 'server'::"platform_role_scope_type"
    ELSE 'channel'::"platform_role_scope_type"
  END,
  assignment."server_id",
  assignment."channel_id",
  assignment."assigned_by",
  assignment."assigned_at"
FROM "moderator_assignments" assignment
INNER JOIN "roles" role
  ON role."name" = CASE
    WHEN assignment."scope_type" = 'server' THEN 'server_moderator'
    ELSE 'channel_moderator'
  END;

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_public_id_key" ON "user_role_assignments"("public_id");
CREATE INDEX "user_role_assignments_user_id_revoked_at_expires_at_idx" ON "user_role_assignments"("user_id", "revoked_at", "expires_at");
CREATE INDEX "user_role_assignments_role_id_server_id_revoked_at_expires_at_idx" ON "user_role_assignments"("role_id", "server_id", "revoked_at", "expires_at");
CREATE INDEX "user_role_assignments_server_id_revoked_at_expires_at_idx" ON "user_role_assignments"("server_id", "revoked_at", "expires_at");
CREATE INDEX "user_role_assignments_channel_id_revoked_at_expires_at_idx" ON "user_role_assignments"("channel_id", "revoked_at", "expires_at");
CREATE INDEX "user_role_assignments_assigned_at_idx" ON "user_role_assignments"("assigned_at");
CREATE UNIQUE INDEX "roles_id_scope_type_key" ON "roles"("id", "scope_type");
CREATE UNIQUE INDEX "channels_id_server_id_key" ON "channels"("id", "server_id");

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enforce role and channel scope integrity beyond application validation.
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_scope_fkey" FOREIGN KEY ("role_id", "scope_type") REFERENCES "roles"("id", "scope_type") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_channel_server_fkey" FOREIGN KEY ("channel_id", "server_id") REFERENCES "channels"("id", "server_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prevent overlapping current or scheduled assignment periods under concurrency.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "user_role_assignments"
ADD CONSTRAINT "user_role_assignments_no_overlapping_periods"
EXCLUDE USING gist (
  "user_id" WITH =,
  "role_id" WITH =,
  "server_id" WITH =,
  (COALESCE("channel_id", 0)) WITH =,
  (
    tstzrange(
      "assigned_at",
      LEAST(
        COALESCE("expires_at", 'infinity'::timestamptz),
        COALESCE("revoked_at", 'infinity'::timestamptz)
      ),
      '[)'
    )
  ) WITH &&
);

-- RemoveTable
DROP TABLE "moderator_assignments";

-- RemoveEnum
DROP TYPE "moderator_scope_type";
