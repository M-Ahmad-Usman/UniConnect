/*
  Warnings:

  - A unique constraint covering the columns `[server_id,course_id]` on the table `channels` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "channels_course_id_key";

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by" INTEGER,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "channels_server_id_course_id_key" ON "channels"("server_id", "course_id");

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
