// src/server/mappers/asset.mapper.ts

import type { ExternalAsset } from "@/server/integrations/assetsApi";
import type { ExternalCollaborator } from "@/server/integrations/collabApi";
import type { EquipmentStatus } from "@prisma/client";

/** Estructura objetivo sugerida (ajusta a tu Prisma/DTO real) */
export type AssetData = {
  assetCode: string;
  kind: string;
  model: string | null;
  serial: string | null;
  purchasedAt: Date | null;
  status: EquipmentStatus;
};

export type CollaboratorData = {
  collabId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
};

/* Helper robusto para fechas ISO */
function parseISOorNull(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapStatus(status?: string | null): EquipmentStatus {
  if (!status) return "ALTA";
  const normalized = status.trim().toUpperCase().replace(/\s+/g, "_");
  return (
    {
      ALTA: "ALTA",
      ASIGNADO: "ASIGNADO",
      TRANSFERENCIA_PENDIENTE: "TRANSFERENCIA_PENDIENTE",
      BAJA: "BAJA",
    }[normalized] ?? "ALTA"
  );
}

export function mapExternalToAssetData(x: ExternalAsset): AssetData {
  return {
    assetCode: x.code,
    kind: x.kind,
    model: x.model ?? null,
    serial: x.serial ?? null,
    purchasedAt: parseISOorNull(x.purchasedAt),
    status: mapStatus(x.status),
  };
}

export function mapExternalToCollaboratorData(
  x: ExternalCollaborator
): CollaboratorData {
  return {
    collabId: x.emplid ?? x.id,
    name: x.name ?? null,
    phone: x.phone ?? null,
    email: x.email ?? null,
  };
}
