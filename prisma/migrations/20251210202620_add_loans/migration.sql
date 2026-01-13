-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "teamName" TEXT;

-- CreateTable
CREATE TABLE "Loan" (
    "id" SERIAL NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "collaboratorName" TEXT,
    "collaboratorEmail" TEXT,
    "departmentName" TEXT,
    "address" TEXT,
    "teamName" TEXT NOT NULL,
    "platformId" INTEGER,
    "comments" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;
