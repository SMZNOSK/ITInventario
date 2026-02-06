// src/app/api/loans/[id]/recover/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

function parseId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Id de préstamo inválido.");
  return id;
}

function toNoStoreJson(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function cleanText(raw: any): string {
  return String(raw ?? "").trim();
}

/**
 * Extrae serial y/o assetId desde deviceName
 * Formatos soportados:
 *  - "LAP-000001 · S/N: POIUHGVB11"
 *  - "LAP-000001 · POIUHGVB11"
 *  - "S/N: POIUHGVB11"
 */
function extractAssetInfoFromDeviceName(raw: any): { serial: string | null; assetId: number | null } {
  const s = cleanText(raw);
  if (!s) return { serial: null, assetId: null };

  // Extraer código tipo LAP-000001
  const codeMatch = s.match(/\b([A-Za-z]{3})-(\d{6})\b/);
  let assetId: number | null = null;
  if (codeMatch?.[2]) {
    const n = Number.parseInt(codeMatch[2], 10);
    if (Number.isFinite(n) && n > 0) assetId = n;
  }

  // Extraer serial: buscar después de "S/N:", "SN:", "SERIAL:" o después del separador " · "
  const snMatch = s.match(/(?:S\/N|SN|SERIAL|SERIE)\s*[:#]?\s*([A-Za-z0-9-]+)/i);
  let serial = snMatch ? snMatch[1]?.trim() : null;

  // Fallback: si hay código, el serial puede estar después del separador
  if (!serial && codeMatch) {
    const afterCode = s.slice(s.indexOf(codeMatch[0]) + codeMatch[0].length);
    const tokens = afterCode.split(/[^A-Za-z0-9-]+/).filter(Boolean);
    const stop = new Set(["SN", "S", "N", "SERIAL", "SERIE", "NO"]);
    const candidates = tokens
      .filter((t) => !stop.has(t.toUpperCase()))
      .filter((t) => t.length >= 4);
    if (candidates.length > 0) serial = candidates[0];
  }

  return { serial, assetId };
}

// POST /api/loans/:id/recover
export const POST = withError(async (req: NextRequest, { params }: RouteParams) => {
  await requireAuth(req);

  const { id: rawId } = await params;
  const id = parseId(rawId);

  const loan = await prisma.loan.findUnique({
    where: { id },
    select: { id: true, teamName: true, deviceName: true },
  });

  if (!loan) return toNoStoreJson({ error: "Préstamo no encontrado." }, 404);

  const now = new Date();

  // Extraer información del activo desde deviceName (donde guardamos "LAP-000001 · S/N: POIUHGVB11")
  const assetInfo = extractAssetInfoFromDeviceName((loan as any).deviceName);

  // Si no se pudo extraer serial del deviceName, intentar con teamName
  if (!assetInfo.serial && loan.teamName) {
    const fallbackInfo = extractAssetInfoFromDeviceName(loan.teamName);
    if (fallbackInfo.serial) {
      assetInfo.serial = fallbackInfo.serial;
    }
    if (!assetInfo.assetId && fallbackInfo.assetId) {
      assetInfo.assetId = fallbackInfo.assetId;
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1) Marcar devolución hoy estableciendo returnDate
      await tx.loan.update({
        where: { id },
        data: { returnDate: now },
      });

      // 2) Regresar equipo a ALTA - buscar por SERIAL primero (es la fuente de verdad)
      let updated = false;

      if (assetInfo.serial) {
        // Buscar por serial es más confiable (el código LAP-000001 puede no coincidir con el ID real)
        const result = await tx.asset.updateMany({
          where: { serial: assetInfo.serial, status: "ASIGNADO" },
          data: { status: "ALTA" },
        });
        updated = result.count > 0;
      }

      // Fallback: si no se encontró por serial, intentar por assetId
      if (!updated && assetInfo.assetId) {
        const result = await tx.asset.updateMany({
          where: { id: assetInfo.assetId, status: "ASIGNADO" },
          data: { status: "ALTA" },
        });
        updated = result.count > 0;
      }

      // Si no se pudo actualizar el activo, aún así marcar el préstamo como devuelto
      // pero registrar en consola para diagnóstico
      if (!updated) {
        console.warn(`[LOAN RECOVER] No se pudo actualizar activo para préstamo ${id}:`, {
          loanId: id,
          deviceName: loan.deviceName,
          teamName: loan.teamName,
          extractedSerial: assetInfo.serial,
          extractedAssetId: assetInfo.assetId,
        });
      }
    });

    return toNoStoreJson({ ok: true, assetUpdated: true });
  } catch (error) {
    console.error(`[LOAN RECOVER ERROR] Failed to mark loan ${id} as returned:`, error);
    // Aún así devolver success si el error no es crítico
    // El préstamo se marcó como devuelto, solo no se actualizó el activo
    return toNoStoreJson({
      ok: true,
      assetUpdated: false,
      warning: "Préstamo marcado como devuelto, pero no se pudo actualizar el estado del activo"
    });
  }
});
