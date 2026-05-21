CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "target_id" VARCHAR(100),
    "summary" JSONB,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
