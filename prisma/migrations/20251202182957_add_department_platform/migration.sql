/*
  Warnings:

  - You are about to drop the `StorageOption` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name,vendor]` on the table `DiskType` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DiskType_name_key";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "departmentId" INTEGER,
ADD COLUMN     "platformId" INTEGER;

-- DropTable
DROP TABLE "StorageOption";

-- CreateTable
CREATE TABLE "StorageCapacity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageCapacity_name_key" ON "StorageCapacity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_name_key" ON "Platform"("name");

-- CreateIndex
CREATE INDEX "Assignment_departmentId_idx" ON "Assignment"("departmentId");

-- CreateIndex
CREATE INDEX "Assignment_platformId_idx" ON "Assignment"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "DiskType_name_vendor_key" ON "DiskType"("name", "vendor");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;
