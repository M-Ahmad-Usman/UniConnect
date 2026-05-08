-- AlterTable
ALTER TABLE "notification_preferences"
ADD COLUMN "notification_type" "notification_type" NOT NULL DEFAULT 'new_post';

-- DropIndex
DROP INDEX "notification_preferences_user_id_scope_type_server_id_chann_key";

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_notification_type_scope__key"
ON "notification_preferences"("user_id", "notification_type", "scope_type", "server_id", "channel_id");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_server_id_notification_ty_idx"
ON "notification_preferences"("user_id", "server_id", "notification_type");
