/*
  Warnings:

  - You are about to drop the column `teamName` on the `Assignment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[teamName]` on the table `Collaborator` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "teamName";

-- AlterTable
ALTER TABLE "Collaborator" ADD COLUMN     "teamName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Collaborator_teamName_key" ON "Collaborator"("teamName");
