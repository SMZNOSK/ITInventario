-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "hotelId" INTEGER,
ADD COLUMN     "hotelName" TEXT;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
