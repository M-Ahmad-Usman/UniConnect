DO $$
BEGIN
  CREATE TYPE "teaching_assignment_end_reason" AS ENUM (
    'replaced',
    'removed',
    'semester_progression',
    'graduation'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "teaching_assignment_history" (
  "id" SERIAL NOT NULL,
  "public_id" UUID NOT NULL DEFAULT uuidv7(),
  "teacher_id" INTEGER NOT NULL,
  "course_id" INTEGER NOT NULL,
  "class_id" INTEGER NOT NULL,
  "channel_id" INTEGER NOT NULL,
  "semester_number" INTEGER NOT NULL,
  "assigned_by" INTEGER,
  "assigned_at" TIMESTAMPTZ(3) NOT NULL,
  "ended_by" INTEGER,
  "ended_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "end_reason" "teaching_assignment_end_reason" NOT NULL,
  CONSTRAINT "teaching_assignment_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teaching_assignment_history_public_id_key" ON "teaching_assignment_history"("public_id");
CREATE INDEX "teaching_assignment_history_teacher_id_ended_at_idx" ON "teaching_assignment_history"("teacher_id", "ended_at");
CREATE INDEX "teaching_assignment_history_channel_id_teacher_id_end_reason_idx" ON "teaching_assignment_history"("channel_id", "teacher_id", "end_reason");
CREATE INDEX "teaching_assignment_history_class_id_idx" ON "teaching_assignment_history"("class_id");
CREATE INDEX "teaching_assignment_history_course_id_idx" ON "teaching_assignment_history"("course_id");
CREATE INDEX "teaching_assignment_history_end_reason_idx" ON "teaching_assignment_history"("end_reason");

ALTER TABLE "teaching_assignment_history" ADD CONSTRAINT "teaching_assignment_history_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher_info"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teaching_assignment_history" ADD CONSTRAINT "teaching_assignment_history_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teaching_assignment_history" ADD CONSTRAINT "teaching_assignment_history_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teaching_assignment_history" ADD CONSTRAINT "teaching_assignment_history_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teaching_assignment_history" ADD CONSTRAINT "teaching_assignment_history_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "teaching_assignment_history" ADD CONSTRAINT "teaching_assignment_history_ended_by_fkey" FOREIGN KEY ("ended_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
