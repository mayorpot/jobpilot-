/*
  Warnings:

  - A unique constraint covering the columns `[storagePath]` on the table `Resume` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `storagePath` to the `Resume` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "storagePath" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Resume_storagePath_key" ON "Resume"("storagePath");

-- CreateIndex
CREATE INDEX "Resume_userId_createdAt_idx" ON "Resume"("userId", "createdAt");
