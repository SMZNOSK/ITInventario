// src/server/modules/disposals/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { DisposalInput } from "@/server/dto/disposals";
import type { Prisma } from "@prisma/client";

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
  evidences?: { id: number; url: string; filename?: string | null }[];
};

/** Mapea el row de Prisma al tipo que usamos en el frontend */
function mapRowToListItem(row: any): DisposalListItem {
  // Detectar si está restaurado
  const isRestored = row.asset?.status !== "BAJA" || row.restoredAt != null;

  return {
    id: String(row.id),
    assetSerial: row.asset?.serial ?? "",
    reason: row.reason,
    notes: row.notes ?? undefined,
    evidenceUrl: row.evidenceUrl ?? undefined,
    disposedAt: row.disposedAt,
    restoredAt: isRestored ? (row.restoredAt ?? new Date()) : null,
    asset: row.asset ? {
      id: row.asset.id,
      status: row.asset.status,
      typeName: row.asset.type?.name ?? null,
      brandName: row.asset.brand?.name ?? null,
      modelName: row.asset.model?.name ?? null,
      hotelName: row.asset.currentHotel?.name ?? null,
    } : undefined,
    evidences: row.evidences?.map((e: any) => ({
      id: e.id,
      url: e.url,
      filename: e.filename ?? null,
    })) ?? [],
  };
}

/* ========= Listado ========= */

/** Lista todas las bajas (sin filtrar por hotel) - legacy */
export async function list(): Promise<DisposalListItem[]> {
  return listFiltered({});
}

export type ListFilterOptions = {
  hotelIds?: number[] | null;
  q?: string;
  page?: number;
  pageSize?: number;
};

/** Lista bajas con filtros de hotel, búsqueda y paginación */
export async function listFiltered(options: ListFilterOptions): Promise<DisposalListItem[]> {
  const { hotelIds, q, page = 1, pageSize = 100 } = options;

  try {
    const where: Prisma.DisposalWhereInput = {};

    // Filtrar por hoteles si se especifican
    if (hotelIds && hotelIds.length > 0) {
      where.hotelId = { in: hotelIds };
    }

    // Búsqueda por texto
    if (q && q.trim()) {
      const searchTerm = q.trim();
      where.OR = [
        { asset: { serial: { contains: searchTerm, mode: "insensitive" } } },
        { reason: { contains: searchTerm, mode: "insensitive" } },
        { notes: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.disposal.findMany({
      where,
      include: {
        asset: {
          include: {
            type: true,
            brand: true,
            model: true,
            currentHotel: true,
          },
        },
        evidences: true,
      },
      orderBy: { disposedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return rows.map(mapRowToListItem);
  } catch (err) {
    console.error("[disposals:listFiltered] Error:", err);
    throw { status: 500, message: "Error al listar bajas" };
  }
}

/* ========= Crear baja ========= */

export async function create(data: DisposalInput): Promise<DisposalListItem> {
  try {
    return await prisma.$transaction(async (tx) => {
      const rawAssetId = (data as any).assetId;
      const raw = String(rawAssetId).trim();
      if (!raw) {
        throw { status: 400, message: "assetId es requerido" };
      }

      // Localizar asset por id o serial
      let asset;
      const maybeNumber = Number(raw);
      if (Number.isFinite(maybeNumber)) {
        asset = await tx.asset.findUnique({
          where: { id: maybeNumber },
          include: { currentHotel: true },
        });
      }
      if (!asset) {
        asset = await tx.asset.findUnique({
          where: { serial: raw },
          include: { currentHotel: true },
        });
      }
      if (!asset) {
        throw { status: 404, message: "Asset not found" };
      }

      // Validar estado actual
      if (asset.status === "BAJA") {
        throw { status: 409, message: "El equipo ya está dado de baja" };
      }

      // Validar si tiene asignaciones activas
      const activeAssignment = await tx.assignment.findFirst({
        where: {
          assetId: asset.id,
          status: "ASIGNADO",
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
          evidences: true,
        },
      });

      // Crear registros de evidencia si se proporcionan URLs
      const evidenceUrls = (data as any).evidenceUrls as string[] | undefined;
      if (evidenceUrls && evidenceUrls.length > 0) {
        await tx.disposalEvidence.createMany({
          data: evidenceUrls.map((url) => ({
            disposalId: created.id,
            url,
            filename: url.split("/").pop() ?? null,
          })),
        });
      }

      // Actualizar estado del equipo a BAJA
      await tx.asset.update({
        where: { id: asset.id },
        data: { status: "BAJA" },
      });

      // Re-fetch para incluir evidencias creadas
      const final = await tx.disposal.findUnique({
        where: { id: created.id },
        include: {
          asset: {
            include: {
              type: true,
              brand: true,
              model: true,
              currentHotel: true,
            },
          },
          evidences: true,
        },
      });

      return mapRowToListItem(final);
    });
  } catch (err) {
    console.error("[disposals:create] Error:", err);
    if (err && typeof err === "object" && "status" in (err as any)) {
      throw err;
    }
    throw { status: 500, message: "Error al crear baja" };
  }
}

/* ========= Obtener detalle ========= */

export async function getById(id: number) {
  const disposal = await prisma.disposal.findUnique({
    where: { id },
    include: {
      asset: {
        include: {
          type: true,
          brand: true,
          model: true,
          currentHotel: true,
        },
      },
      hotel: true,
      createdBy: {
        select: { id: true, name: true, username: true },
      },
      restoredBy: {
        select: { id: true, name: true, username: true },
      },
      evidences: true,
    },
  });

  return disposal;
}

/* ========= Actualizar baja ========= */

export type UpdateDisposalData = {
  reason?: string;
  notes?: string;
  evidenceUrls?: string[];
};

export async function update(id: number, data: UpdateDisposalData) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.disposal.findUnique({ where: { id } });
    if (!existing) {
      throw { status: 404, message: "Baja no encontrada" };
    }

    const updated = await tx.disposal.update({
      where: { id },
      data: {
        ...(data.reason !== undefined && { reason: data.reason }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    // Agregar nuevas evidencias si se proporcionan
    if (data.evidenceUrls && data.evidenceUrls.length > 0) {
      await tx.disposalEvidence.createMany({
        data: data.evidenceUrls.map((url) => ({
          disposalId: id,
          url,
          filename: url.split("/").pop() ?? null,
        })),
      });
    }

    return updated;
  });
}

/* ========= Restaurar / Confirmar ALTA ========= */

export async function restore(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const disposal = await tx.disposal.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!disposal) {
      throw { status: 404, message: "Baja no encontrada" };
    }

    // Verificar que no esté ya restaurada
    if (disposal.restoredAt) {
      throw { status: 409, message: "Esta baja ya fue restaurada" };
    }

    // Verificar que el asset esté en BAJA
    if (disposal.asset.status !== "BAJA") {
      throw { status: 409, message: "El equipo no está en estado BAJA" };
    }

    // Marcar la baja como restaurada
    const updatedDisposal = await tx.disposal.update({
      where: { id },
      data: {
        restoredAt: new Date(),
        restoredById: userId,
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

    // Cambiar el asset a ALTA
    const updatedAsset = await tx.asset.update({
      where: { id: disposal.assetId },
      data: { status: "ALTA" },
    });

    return { disposal: updatedDisposal, asset: updatedAsset };
  });
}
