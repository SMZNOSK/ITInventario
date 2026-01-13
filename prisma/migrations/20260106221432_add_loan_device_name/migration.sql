-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "deviceName" TEXT;

-- CreateIndex
CREATE INDEX "Loan_collaboratorId_idx" ON "Loan"("collaboratorId");

-- CreateIndex
CREATE INDEX "Loan_hotelId_idx" ON "Loan"("hotelId");

-- CreateIndex
CREATE INDEX "Loan_platformId_idx" ON "Loan"("platformId");

-- CreateIndex
CREATE INDEX "Loan_startDate_idx" ON "Loan"("startDate");
