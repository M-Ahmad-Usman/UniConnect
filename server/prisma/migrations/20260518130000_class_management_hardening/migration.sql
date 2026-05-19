CREATE TYPE "class_status" AS ENUM ('active', 'graduated');

ALTER TABLE "classes"
  ADD COLUMN "status" "class_status" NOT NULL DEFAULT 'active',
  ADD COLUMN "graduated_at" TIMESTAMP(3),
  ADD COLUMN "graduated_by" INTEGER;

ALTER TABLE "classes"
  ADD CONSTRAINT "classes_graduated_by_fkey"
  FOREIGN KEY ("graduated_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "teaches_class_id_course_id_key" ON "teaches"("class_id", "course_id");

CREATE INDEX "classes_status_idx" ON "classes"("status");
