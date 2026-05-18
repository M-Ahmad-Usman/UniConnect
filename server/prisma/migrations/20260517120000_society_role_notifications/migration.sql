ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'society_request_reviewed';

CREATE INDEX IF NOT EXISTS "societies_department_id_idx" ON "societies"("department_id");
CREATE INDEX IF NOT EXISTS "server_memberships_user_id_idx" ON "server_memberships"("user_id");
CREATE INDEX IF NOT EXISTS "society_membership_requests_society_id_status_requested_at_idx"
  ON "society_membership_requests"("society_id", "status", "requested_at");
CREATE INDEX IF NOT EXISTS "society_membership_requests_user_id_status_idx"
  ON "society_membership_requests"("user_id", "status");
CREATE INDEX IF NOT EXISTS "notifications_user_id_type_created_at_idx"
  ON "notifications"("user_id", "type", "created_at");
