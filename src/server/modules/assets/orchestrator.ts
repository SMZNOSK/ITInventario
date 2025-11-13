// src/server/modules/assets/orchestrator.ts
import "server-only";
import { prisma } from "@/lib/db";
import { getAssetByCode } from "@/server/integrations/assetsApi";

export async function findAssetBySerial(serial: string) {
  return prisma.asset.findUnique({ where: { serial } });
}

export async function upsertAssetBySerial(input: {
  serial: string;
  typeId: number;
  brandId: number;
  modelId: number;
  currentHotelId?: number | null;
  status?: "ALTA" | "ASIGNADO" | "TRANSFERENCIA_PENDIENTE" | "BAJA";
  invoiceNumber?: string | null;
  invoiceDate?: Date | null;
}) {
  return prisma.asset.upsert({
    where: { serial: input.serial },
    update: {
      typeId: input.typeId,
      brandId: input.brandId,
      modelId: input.modelId,
      currentHotelId: input.currentHotelId ?? null,
      status: input.status ?? undefined,
      invoiceNumber: input.invoiceNumber ?? undefined,
      invoiceDate: input.invoiceDate ?? undefined,
    },
    create: {
      serial: input.serial,
      typeId: input.typeId,
      brandId: input.brandId,
      modelId: input.modelId,
      currentHotelId: input.currentHotelId ?? null,
      status: input.status ?? "ALTA",
      invoiceNumber: input.invoiceNumber ?? null,
      invoiceDate: input.invoiceDate ?? null,
    },
  });
}

/** Importa un asset desde API externa por code (PS/REST). */
export async function importAssetByCode(code: string) {
  const r = await getAssetByCode(code);
  if (!r.ok) {
    return { ok: false as const, reason: r.reason ?? "ASSET_API not configured" };
  }

  // TODO: si viene serial/model/etc. puedes mapear y hacer upsert aquí.
  // const serial = r.data.serial ?? r.data.code;
  // await upsertAssetBySerial({ serial, typeId, brandId, modelId, status: "ALTA" });

  return { ok: true as const, external: r.data };
}
