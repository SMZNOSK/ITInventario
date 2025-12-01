// src/server/modules/disposals/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { DisposalInput } from "@/server/dto/disposals";

export type DisposalListItem = {
  id: string;
  assetSerial: string;
  reason: string;
  notes?: string;
  evidenceUrl?: string;
  disposedAt: Date;
};

/** Mapea el row de Prisma al tipo que usamos en el frontend */
function mapRowToListItem(row: {
  id: number;
  reason: string;
  notes: string | null;
  evidenceUrl: string | null;
  disposedAt: Date;
  asset: { serial: string };
}): DisposalListItem {
  return {
    id: String(row.id),
    assetSerial: row.asset.serial,
    reason: row.reason,
    notes: row.notes ?? undefined,
    evidenceUrl: row.evidenceUrl ?? undefined,
    disposedAt: row.disposedAt,
  };
}

/** Resolver asset por ID numérico o por serial */
async function resolveAsset(tx: typeof prisma, rawAssetId: string | number) {
  const raw = String(rawAssetId).trim();
  if (!raw) {
    throw { status: 400, message: "assetId es requerido" };
  }

  // 1) Probar como número (id)
  const maybeNumber = Number(raw);
  if (Number.isFinite(maybeNumber)) {
    const assetById = await tx.asset.findUnique({
      where: { id: maybeNumber },
    });
    if (assetById) {
      return assetById;
    }
  }

  // 2) Probar como serial
  const assetBySerial = await tx.asset.findUnique({
    where: { serial: raw },
  });
  if (assetBySerial) {
    return assetBySerial;
  }

  throw { status: 404, message: "Asset not found" };
}

/* ========= Listado ========= */

export async function list(): Promise<DisposalListItem[]> {
  try {
    const rows = await prisma.disposal.findMany({
      include: {
        asset: {
          select: { serial: true },
        },
      },
      orderBy: { disposedAt: "desc" },
    });

    return rows.map(mapRowToListItem);
  } catch (err) {
    console.error("[disposals:list] Error:", err);
    throw { status: 500, message: "Error al listar bajas" };
  }
}

/* ========= Crear baja ========= */

export async function create(data: DisposalInput): Promise<DisposalListItem> {
  try {
    return await prisma.$transaction(async (tx) => {
      const rawAssetId = (data as any).assetId;

      // Localizar asset por id o serial
      const asset = await resolveAsset(tx, rawAssetId);

      // Validar estado actual
      if (asset.status === "BAJA") {
        throw { status: 409, message: "El equipo ya está dado de baja" };
      }

      const disposedAt: Date =
        (data as any).disposedAt instanceof Date
          ? (data as any).disposedAt
          : new Date();

      const created = await tx.disposal.create({
        data: {
          assetId: asset.id,
          reason: data.reason,
          notes: data.notes ?? null,
          evidenceUrl: data.evidenceUrl ?? null,
          disposedAt,
          createdById: (data as any).createdById ?? null,
        },
        include: {
          asset: {
            select: { serial: true },
          },
        },
      });

      // Actualizar estado del equipo a BAJA
      await tx.asset.update({
        where: { id: asset.id },
        data: { status: "BAJA" },
      });

      return mapRowToListItem(created);
    });
  } catch (err) {
    console.error("[disposals:create] Error:", err);
    // Si ya viene con { status, message } lo respetamos
    if (err && typeof err === "object" && "status" in (err as any)) {
      throw err;
    }
    throw { status: 500, message: "Error al crear baja" };
  }
}
