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

/* ========= Helpers ========= */

function mapRowToListItem(row: {
  id: number;
  collaboratorId: string;
  collaboratorName: string | null;
  status: "ASIGNADO" | "DEVUELTO";
  assignedAt: Date;
  returnedAt: Date | null;
  asset: { serial: string };
}): AssignmentListItem {
  return {
    id: String(row.id),
    assetSerial: row.asset?.serial ?? "",
    collaboratorId: row.collaboratorId,
    collaboratorName: row.collaboratorName ?? "",
    status: row.status,
    assignedAt: row.assignedAt,
    returnedAt: row.returnedAt ?? undefined,
  };
}

/* ========= Listado ========= */

export async function list(): Promise<AssignmentListItem[]> {
  try {
    const rows = await prisma.assignment.findMany({
      include: { asset: true },
      orderBy: { assignedAt: "desc" },
    });

    return rows.map(mapRowToListItem);
  } catch (err) {
    console.error("[assignments:list] Error:", err);
    throw { status: 500, message: "Error al listar asignaciones" };
  }
}

/* ========= Crear asignación ========= */

export async function assign(data: AssignInput): Promise<AssignmentListItem> {
  try {
    return await prisma.$transaction(async (tx) => {
      const rawAssetId = (data as any).assetId;

      if (!rawAssetId && rawAssetId !== 0) {
        throw { status: 400, message: "assetId es requerido" };
      }

      // 1) Intentar como ID numérico
      let asset = null;
      let numericAssetId: number | null = null;

      const maybeNumber = Number(rawAssetId);
      if (Number.isFinite(maybeNumber)) {
        numericAssetId = maybeNumber;
        asset = await tx.asset.findUnique({
          where: { id: maybeNumber },
        });
      }

      // 2) Si no se encontró por ID (o no era número), intentar por serial
      if (!asset) {
        asset = await tx.asset.findUnique({
          where: { serial: String(rawAssetId) },
        });
        if (asset) {
          numericAssetId = asset.id;
        }
      }

      if (!asset || numericAssetId == null) {
        throw { status: 404, message: "Asset not found" };
      }

      // 3) Validar estado del asset
      if (asset.status === "BAJA") {
        throw {
          status: 409,
          message: "El equipo está en BAJA y no se puede asignar",
        };
      }

      // 4) Verificar que no haya asignación abierta
      const open = await tx.assignment.findFirst({
        where: {
          assetId: numericAssetId,
          status: "ASIGNADO",
        },
      });

      if (open) {
        throw { status: 409, message: "Asset already assigned (open)" };
      }

      // 5) Crear la asignación
      const created = await tx.assignment.create({
        data: {
          assetId: numericAssetId,
          collaboratorId: data.collaboratorId,
          collaboratorName: (data as any).collaboratorName ?? null,
          status: "ASIGNADO",
          assignedAt: (data as any).startAt ?? new Date(),
          createdById: (data as any).assignedBy ?? null,
        },
        include: { asset: true },
      });

      // 6) Actualizar estado del asset a ASIGNADO
      await tx.asset.update({
        where: { id: numericAssetId },
        data: { status: "ASIGNADO" },
      });

      return mapRowToListItem(created);
    });
  } catch (err) {
    console.error("[assignments:assign] Error:", err);
    if (err && typeof err === "object" && "status" in (err as any)) {
      throw err;
    }
    throw { status: 500, message: "Error al crear asignación" };
  }
}

/* ========= Terminar asignación ========= */

export async function end(id: string): Promise<AssignmentListItem> {
  try {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      throw { status: 400, message: "assignment id inválido" };
    }

    const existing = await prisma.assignment.findUnique({
      where: { id: numericId },
      include: { asset: true },
    });

    if (!existing) {
      throw { status: 404, message: "Assignment not found" };
    }

    if (existing.status === "DEVUELTO") {
      // Ya está devuelta → devolvemos tal cual
      return mapRowToListItem(existing as any);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedAssignment = await tx.assignment.update({
        where: { id: numericId },
        data: {
          status: "DEVUELTO",
          returnedAt: new Date(),
        },
        include: { asset: true },
      });

      // Devolver el equipo a ALTA
      await tx.asset.update({
        where: { id: existing.assetId },
        data: { status: "ALTA" },
      });

      return updatedAssignment;
    });

    return mapRowToListItem(updated as any);
  } catch (err) {
    console.error("[assignments:end] Error:", err);
    if (err && typeof err === "object" && "status" in (err as any)) {
      throw err;
    }
    throw { status: 500, message: "Error al terminar asignación" };
  }
}
