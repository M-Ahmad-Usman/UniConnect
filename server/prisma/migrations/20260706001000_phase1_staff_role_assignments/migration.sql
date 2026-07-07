-- Phase 1 audited staff-role assignments. This migration intentionally follows
-- the enum migration so PostgreSQL can safely use department/global enum values.

CREATE TABLE "staff_role_assignments" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "scope_type" "platform_role_scope_type" NOT NULL,
    "department_id" INTEGER,
    "assigned_by" INTEGER,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3),
    "revoked_by" INTEGER,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "staff_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_role_assignments_public_id_key"
ON "staff_role_assignments"("public_id");

CREATE INDEX "staff_role_assignments_user_id_revoked_at_expires_at_idx"
ON "staff_role_assignments"("user_id", "revoked_at", "expires_at");

CREATE INDEX "staff_role_assignments_role_id_department_id_revoked_at_exp_idx"
ON "staff_role_assignments"("role_id", "department_id", "revoked_at", "expires_at");

CREATE INDEX "staff_role_assignments_department_id_revoked_at_expires_idx"
ON "staff_role_assignments"("department_id", "revoked_at", "expires_at");

CREATE INDEX "staff_role_assignments_assigned_at_idx"
ON "staff_role_assignments"("assigned_at");

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_role_assignments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_role_assignments_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_role_assignments_department_id_fkey"
FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_role_assignments_assigned_by_fkey"
FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_role_assignments_revoked_by_fkey"
FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_role_assignments_scope_check"
CHECK (
  ("scope_type" = 'global' AND "department_id" IS NULL)
  OR
  ("scope_type" = 'department' AND "department_id" IS NOT NULL)
);

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_role_assignments_expiry_check"
CHECK ("expires_at" IS NULL OR "expires_at" > "assigned_at");

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_role_assignments_revocation_check"
CHECK (
  ("revoked_at" IS NULL AND "revoked_by" IS NULL)
  OR
  ("revoked_at" IS NOT NULL AND "revoked_at" >= "assigned_at")
);

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_role_assignments_role_scope_fkey"
FOREIGN KEY ("role_id", "scope_type") REFERENCES "roles"("id", "scope_type")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_role_assignments_no_overlapping_periods"
EXCLUDE USING gist (
  "user_id" WITH =,
  "role_id" WITH =,
  (COALESCE("department_id", 0)) WITH =,
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

ALTER TABLE "staff_role_assignments"
ADD CONSTRAINT "staff_global_role_assignments_no_overlapping_periods"
EXCLUDE USING gist (
  "role_id" WITH =,
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
)
WHERE ("scope_type" = 'global'::"platform_role_scope_type" AND "department_id" IS NULL);

INSERT INTO "roles" ("name", "scope_type")
VALUES
  ('admin', 'global'),
  ('enrollment_officer', 'department')
ON CONFLICT ("name") DO UPDATE SET "scope_type" = EXCLUDED."scope_type";

INSERT INTO "staff_role_assignments" ("user_id", "role_id", "scope_type", "assigned_by")
SELECT "users"."id", "roles"."id", 'global'::"platform_role_scope_type", NULL
FROM "users"
CROSS JOIN "roles"
WHERE "users"."user_type" = 'Staff'
  AND "users"."is_deleted" = FALSE
  AND "roles"."name" = 'admin'
ON CONFLICT DO NOTHING;
