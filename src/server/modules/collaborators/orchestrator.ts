// src/server/modules/collaborators/orchestrator.ts
import "server-only";
// import { prisma } from "@/lib/db";
import { bienesPorEmpleadoPS, altaColaboradorPS } from "@/server/integrations/collabApi";

/** Consulta bienes por empleado (SOAP) y devuelve payload crudo. */
export async function importExternalAssetsForEmployee(emplId: string) {
  const out = await bienesPorEmpleadoPS(emplId);
  return out;
}

/** Alta de colaborador en PeopleSoft (SOAP). */
export async function altaColaboradorEnPS(emplId: string) {
  const out = await altaColaboradorPS(emplId);
  // Ejemplo opcional de upsert local:
  // await prisma.collaborator.upsert({ where: { collabId: emplId }, update: {}, create: { collabId: emplId, name: "Pendiente" }});
  return out;
}
