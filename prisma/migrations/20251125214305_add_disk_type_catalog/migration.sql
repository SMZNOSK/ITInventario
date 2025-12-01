/*
  Warnings:

  - You are about to drop the column `interface` on the `DiskType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DiskType" DROP COLUMN "interface",
ADD COLUMN     "vendor" TEXT;
