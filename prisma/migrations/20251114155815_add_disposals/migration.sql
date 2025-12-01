-- CreateTable
CREATE TABLE "Disposal" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "evidenceUrl" TEXT,
    "disposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,

    CONSTRAINT "Disposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Disposal_assetId_idx" ON "Disposal"("assetId");

-- AddForeignKey
ALTER TABLE "Disposal" ADD CONSTRAINT "Disposal_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disposal" ADD CONSTRAINT "Disposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
