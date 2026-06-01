-- Module 5: society lifecycle cascade and durable society notifications.

ALTER TYPE "notification_type" ADD VALUE 'society_suspended';
ALTER TYPE "notification_type" ADD VALUE 'society_activated';
ALTER TYPE "notification_type" ADD VALUE 'society_deleted';
ALTER TYPE "notification_type" ADD VALUE 'society_restored';

ALTER TABLE "notifications"
ADD COLUMN "society_id" INTEGER;

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_society_id_fkey"
FOREIGN KEY ("society_id") REFERENCES "societies"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "notifications_society_id_idx"
ON "notifications"("society_id");

ALTER TABLE "societies"
ADD CONSTRAINT "societies_lifecycle_state_check"
CHECK (
  (
    "is_deleted" = TRUE
    AND "is_active" = FALSE
    AND "deleted_at" IS NOT NULL
    AND "deleted_cascade_id" IS NOT NULL
  )
  OR
  (
    "is_deleted" = FALSE
    AND "deleted_at" IS NULL
    AND "deleted_by" IS NULL
    AND "deleted_cascade_id" IS NULL
    AND "is_active" = ("status" = 'active'::"society_status")
  )
);

ALTER TABLE "servers"
ADD CONSTRAINT "servers_lifecycle_state_check"
CHECK (
  (
    "is_deleted" = TRUE
    AND "is_active" = FALSE
    AND "deleted_at" IS NOT NULL
  )
  OR
  (
    "is_deleted" = FALSE
    AND "deleted_at" IS NULL
    AND "deleted_by" IS NULL
    AND "deleted_cascade_id" IS NULL
  )
);

ALTER TABLE "channels"
ADD CONSTRAINT "channels_lifecycle_state_check"
CHECK (
  (
    "is_deleted" = TRUE
    AND "deleted_at" IS NOT NULL
  )
  OR
  (
    "is_deleted" = FALSE
    AND "deleted_at" IS NULL
    AND "deleted_by" IS NULL
    AND "deleted_cascade_id" IS NULL
  )
);

CREATE INDEX "channels_server_id_deleted_cascade_id_idx"
ON "channels"("server_id", "deleted_cascade_id")
WHERE "deleted_cascade_id" IS NOT NULL;

ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_scope_channel_check"
CHECK (
  ("scope_type" = 'server'::"notification_scope_type" AND "channel_id" IS NULL)
  OR
  ("scope_type" = 'channel'::"notification_scope_type" AND "channel_id" IS NOT NULL)
);

ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_configurable_type_check"
CHECK ("notification_type" IN (
  'new_post'::"notification_type",
  'role_assigned'::"notification_type"
));

ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_channel_id_server_id_fkey"
FOREIGN KEY ("channel_id", "server_id") REFERENCES "channels"("id", "server_id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "notification_preferences_scope_unique"
ON "notification_preferences"(
  "user_id",
  "notification_type",
  "scope_type",
  "server_id",
  COALESCE("channel_id", 0)
);
