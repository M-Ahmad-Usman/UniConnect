-- CreateIndex
CREATE INDEX "channels_server_id_is_deleted_is_archived_idx" ON "channels"("server_id", "is_deleted", "is_archived");

-- CreateIndex
CREATE INDEX "moderator_assignments_server_id_idx" ON "moderator_assignments"("server_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_post_id_idx" ON "notifications"("post_id");

-- CreateIndex
CREATE INDEX "post_attachments_post_id_idx" ON "post_attachments"("post_id");

-- CreateIndex
CREATE INDEX "posts_channel_id_is_deleted_is_pinned_created_at_idx" ON "posts"("channel_id", "is_deleted", "is_pinned", "created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "server_memberships_server_id_idx" ON "server_memberships"("server_id");
