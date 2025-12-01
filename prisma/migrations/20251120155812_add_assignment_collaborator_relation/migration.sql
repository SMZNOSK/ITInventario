-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
