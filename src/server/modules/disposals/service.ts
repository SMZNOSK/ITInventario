// src/server/modules/disposals/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { DisposeInput } from "@/server/dto/disposals";

export type DisposalListItem = {
  id: string;
  assetId: number;
  assetSerial: string;
  reason: string;
  evidence?: string | null;
  disposedAt: Date;
};

// 🔹 Dummy temporal para la pantalla de “Bajas”
const DUMMY_DISPOSALS: DisposalListItem[] = [
  {
    id: "D-1",
    assetId: 3,
    assetSerial: "MX-ABC-0003",
    reason: "Obsoleto",
    evidence: null,
    disposedAt: new Date("2025-11-01T12:00:00Z"),
  },
  {
    id: "D-2",
    assetId: 4,
    assetSerial: "MX-ABC-0004",
    reason: "Daño irreparable",
    evidence: "foto-dano.jpg",
    disposedAt: new Date("2025-10-15T08:30:00Z"),
  },
];

// 👉 Listado (dummy por ahora)
export async function list(): Promise<DisposalListItem[]> {
  // Futuro: leer de prisma.disposal
  return DUMMY_DISPOSALS;
}

// 👉 Crear baja real en BD
export async function dispose({ assetId, reason, evidence }: DisposeInput) {
  return prisma.$transaction(async (tx) => {
    const numericAssetId = Number(assetId);

    const asset = await tx.asset.findUnique({ where: { id: numericAssetId } });
    if (!asset) throw { status: 404, message: "Asset not found" };

    // @ts-expect-error: si aún no existe el modelo en schema.prisma
    const d = await tx.disposal.create({
      data: { assetId: numericAssetId, reason, evidence },
    });

    // Enum en tu schema: EquipmentStatus — usar "BAJA"
    await tx.asset.update({
      where: { id: numericAssetId },
      data: { status: "BAJA" },
    });

    return d;
  });
}
