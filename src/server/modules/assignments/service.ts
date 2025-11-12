// src/server/modules/assignments/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { AssignInput } from "@/server/dto/assignments";

export type AssignmentListItem = {
  id: string;
  assetSerial: string;
  collaboratorId: string;
  collaboratorName: string;
  status: "ASIGNADO" | "DEVUELTO";
  assignedAt: Date;
  returnedAt?: Date;
};

// Dummy temporal (si el modelo Assignment aún no existe)
const DUMMY_ASSIGNMENTS: AssignmentListItem[] = [
  {
    id: "A-1",
    assetSerial: "MX-ABC-0001",
    collaboratorId: "123456",
    collaboratorName: "Juan Pérez",
    status: "ASIGNADO",
    assignedAt: new Date("2025-11-01T10:00:00Z"),
  },
  {
    id: "A-2",
    assetSerial: "MX-ABC-0001",
    collaboratorId: "789012",
    collaboratorName: "María López",
    status: "DEVUELTO",
    assignedAt: new Date("2025-10-20T09:00:00Z"),
    returnedAt: new Date("2025-10-25T18:30:00Z"),
  },
];

// Helper: intenta usar número si aplica; si no, usa string
function asId<T extends number | string>(raw: string): T {
  const n = Number(raw);
  return (Number.isFinite(n) ? (n as any) : (raw as any)) as T;
}

/** Listado */
export async function list(): Promise<AssignmentListItem[]> {
  try {
    // Si existe el modelo Assignment en Prisma, úsalo.
    // @ts-expect-error: acceso dinámico por si aún no existe el tipo
    const rows = await prisma.assignment.findMany({
      include: { asset: true, collaborator: true },
      orderBy: { startAt: "desc" },
    });

    return rows.map((row: any) => ({
      id: row.id,
      assetSerial: row.asset?.serial ?? "",
      collaboratorId: row.collaboratorId,
      collaboratorName: row.collaborator?.nombre ?? row.collaborator?.name ?? "",
      status: row.endAt ? "DEVUELTO" : "ASIGNADO",
      assignedAt: row.startAt,
      returnedAt: row.endAt ?? undefined,
    }));
  } catch {
    // Fallback al dummy si el modelo aún no existe
    return DUMMY_ASSIGNMENTS;
  }
}

/** Crear asignación */
export async function assign(data: AssignInput) {
  return prisma.$transaction(async (tx) => {
    // Nota: si tu PK de asset es string, asId<string>; si es int, asId<number>
    const assetId = asId<any>(data.assetId);

    const asset = await tx.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw { status: 404, message: "Asset not found" };

    // En tu schema: EquipmentStatus con "ALTA"
    if (asset.status !== "ALTA") {
      throw { status: 400, message: "Asset not ALTA" };
    }

    // @ts-expect-error: dinámico por si el modelo aún no existe
    const open = await tx.assignment.findFirst({
      where: { assetId, endAt: null },
    });
    if (open) throw { status: 409, message: "Asset already assigned (open)" };

    const collab = await tx.collaborator.findUnique({
      where: { id: data.collaboratorId },
    });
    if (!collab) throw { status: 404, message: "Collaborator not found" };

    // @ts-expect-error: dinámico por si el modelo aún no existe
    return tx.assignment.create({
      data: {
        assetId,
        collaboratorId: data.collaboratorId,
        assignedBy: data.assignedBy,
        startAt: data.startAt ?? new Date(),
      },
    });
  });
}

/** Terminar asignación */
export async function end(id: string) {
  // @ts-expect-error: dinámico por si el modelo aún no existe
  return prisma.assignment.update({
    where: { id },
    data: { endAt: new Date() },
  });
}
