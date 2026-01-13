-- CreateTable
CREATE TABLE "ManualAssignment" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "collaboratorName" TEXT NOT NULL,
    "collaboratorEmail" TEXT,
    "direction" TEXT,
    "department" TEXT,
    "hotel" TEXT,
    "description" TEXT,
    "teamName" TEXT,
    "platformId" INTEGER,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASIGNADO',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "createdById" INTEGER,

    CONSTRAINT "ManualAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualAssignment_assetId_idx" ON "ManualAssignment"("assetId");

-- CreateIndex
CREATE INDEX "ManualAssignment_platformId_idx" ON "ManualAssignment"("platformId");

-- CreateIndex
CREATE INDEX "ManualAssignment_status_idx" ON "ManualAssignment"("status");

-- AddForeignKey
ALTER TABLE "ManualAssignment" ADD CONSTRAINT "ManualAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualAssignment" ADD CONSTRAINT "ManualAssignment_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualAssignment" ADD CONSTRAINT "ManualAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
