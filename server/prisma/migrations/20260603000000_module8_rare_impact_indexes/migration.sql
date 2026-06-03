-- Module 8 rare deletion-impact reports use these reverse lookups for bounded
-- blocker and communication-impact counts. Keep this migration additive so the
-- SQL-only Module 4 role constraints and Module 5 notification-preference
-- safeguards remain intact.

CREATE INDEX "student_info_class_id_idx"
ON "student_info"("class_id");

CREATE INDEX "courses_department_id_idx"
ON "courses"("department_id");

CREATE INDEX "teaches_course_id_idx"
ON "teaches"("course_id");

CREATE INDEX "channels_course_id_is_deleted_idx"
ON "channels"("course_id", "is_deleted");

CREATE INDEX "channels_program_id_is_deleted_idx"
ON "channels"("program_id", "is_deleted");

CREATE INDEX "notification_preferences_server_id_idx"
ON "notification_preferences"("server_id");

CREATE INDEX "notification_preferences_channel_id_idx"
ON "notification_preferences"("channel_id");

CREATE INDEX "program_curriculum_course_id_idx"
ON "program_curriculum"("course_id");
