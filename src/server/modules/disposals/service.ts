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
  restoredAt?: Date | null;
  asset?: {
    id: number;
    status: string;
    typeName: string | null;
    brandName: string | null;
    modelName: string | null;
    hotelName: string | null;
  };
};

/** Mapea el row de Prisma al tipo que usamos en el frontend */
function mapRowToListItem(row: any): DisposalListItem {
  // Detectar si está restaurado: 
  // 1) Si asset.status != BAJA, significa que fue restaurado
  // 2) O si restoredAt tiene valor (cuando Prisma lo soporte)
  const isRestored = row.asset?.status !== "BAJA" || row.restoredAt != null;

  return {
    id: String(row.id),
    assetSerial: row.asset?.serial ?? "",
    reason: row.reason,
    notes: row.notes ?? undefined,
    evidenceUrl: row.evidenceUrl ?? undefined,
    disposedAt: row.disposedAt,
    // Si está restaurado pero no tenemos restoredAt, usar fecha actual como aproximación
    restoredAt: isRestored ? (row.restoredAt ?? new Date()) : null,
    asset: row.asset ? {
      id: row.asset.id,
      status: row.asset.status,
      typeName: row.asset.type?.name ?? null,
      brandName: row.asset.brand?.name ?? null,
      modelName: row.asset.model?.name ?? null,
      hotelName: row.asset.currentHotel?.name ?? null,
    } : undefined,
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
      include: { currentHotel: true },
    });
    if (assetById) {
      return assetById;
    }
  }

  // 2) Probar como serial
  const assetBySerial = await tx.asset.findUnique({
    where: { serial: raw },
    include: { currentHotel: true },
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
          include: {
            type: true,
            brand: true,
            model: true,
            currentHotel: true,
          },
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

      // Validar si tiene asignaciones activas
      const activeAssignment = await tx.assignment.findFirst({
        where: {
          assetId: asset.id,
          endDate: null,
        },
      });

      if (activeAssignment) {
        throw {
          status: 400,
          message: "El equipo tiene una asignación activa. Debe liberarse antes de dar de baja."
        };
      }

      const disposedAt: Date =
        (data as any).disposedAt instanceof Date
          ? (data as any).disposedAt
          : new Date();

      const created = await tx.disposal.create({
        data: {
          assetId: asset.id,
          hotelId: asset.currentHotelId ?? null,
          reason: data.reason,
          notes: data.notes ?? null,
          evidenceUrl: data.evidenceUrl ?? null,
          disposedAt,
          createdById: (data as any).createdById ?? null,
        },
        include: {
          asset: {
            include: {
              type: true,
              brand: true,
              model: true,
              currentHotel: true,
            },
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
