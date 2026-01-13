// src/app/api/loans/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import { requireAuth, ensureRole, ensureHotelAccess } from "@/server/guards/auth";

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

type LoanUpdatePayload = {
  teamName?: string;
  platformId?: number | null;
  comments?: string | null;
  startDate?: string; // yyyy-mm-dd o ISO
  endDate?: string; // yyyy-mm-dd o ISO
};

function parseInputDate(input?: string): Date | undefined {
  if (!input) return undefined;

  const isoLike = /^\d{4}-\d{2}-\d{2}$/.test(input) ? `${input}T00:00:00` : input;

  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida.");
  return d;
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

function inferTypeCodeFromTypeName(typeName: string | null | undefined): string | null {
  const s = String(typeName ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleaned) return null;
  return cleaned.slice(0, 3);
}

function pad6(n: number): string {
  return String(Math.trunc(n)).padStart(6, "0");
}

function parseAssetIdFromCodeLabel(codeLabel: string | null): number | null {
  const s = cleanText(codeLabel);
  const m = s.match(/^[A-Za-z]{3}-(\d{6})$/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Strings que SÍ parecen "etiqueta de activo" (no hostname):
 * - contienen código tipo AAA-000000
 * - o contienen marcador de serie (S/N, SN, SERIAL, SERIE)
 */
function looksLikeAssetLabelString(raw: any): boolean {
  const s = cleanText(raw);
  if (!s) return false;
  if (/\b[A-Za-z]{3}-\d{6}\b/.test(s)) return true;
  if (/(?:S\/N|SN|SERIAL|SERIE)\b/i.test(s)) return true;

  // evita el bug típico: hostnames tipo PRESTAM001 tratados como serial
  if (/^PRESTAM/i.test(s)) return false;

  return false;
}

/**
 * Extrae (si existe) un codeLabel y/o serial desde una etiqueta de activo:
 *  - "LAP-000001 · S/N: POIUHGVB11"
 *  - "LAP-000001 · POIUHGVB11"
 *  - "S/N: POIUHGVB11"
 */
function extractFromAssetLabel(raw: any): { codeLabel: string | null; serial: string | null } {
  const s = cleanText(raw);
  if (!s) return { codeLabel: null, serial: null };

  const codeMatch = s.match(/\b([A-Za-z]{3}-\d{6})\b/);
  const codeLabel = codeMatch ? codeMatch[1].toUpperCase() : null;

  const snMatch = s.match(/(?:S\/N|SN|SERIAL|SERIE)\s*[:#]?\s*([A-Za-z0-9-]+)/i);
  let serial = snMatch ? snMatch[1]?.trim() : null;

  if (!serial) {
    const tokens = s.split(/[^A-Za-z0-9-]+/).filter(Boolean);
    const stop = new Set(["SN", "S", "N", "SERIAL", "SERIE", "NO", "NUM", "NUMERO", "DE"]);
    const candidates = tokens
      .filter((t) => !/^[A-Za-z]{3}-\d{6}$/i.test(t))
      .filter((t) => !stop.has(t.toUpperCase()))
      .filter((t) => t.length >= 4);

    candidates.sort((a, b) => b.length - a.length);
    serial = candidates[0]?.trim() ?? null;
  }

  return { codeLabel, serial };
}

/**
 * Hint del asset para UI:
 * - assetSerial: serial REAL (ej. POIUHGVB11)
 * - assetTypeCode: solo el tipo (ej. LAP / CPU)
 * - assetCodeLabel: "LAP-000001" (si no viene, lo calcula con typeCode + asset.id)
 *
 * IMPORTANTE:
 * - Para préstamos NUEVOS: el activo vive en loan.deviceName (no en teamName).
 * - teamName es hostname/etiqueta de préstamo => NO debe inferirse como serial.
 */
async function resolveAssetHintFromLoanStrings(
  teamName?: string | null,
  deviceName?: string | null,
) {
  // 1) Preferir deviceName (etiqueta del activo)
  let parsed: { codeLabel: string | null; serial: string | null } = { codeLabel: null, serial: null };

  if (looksLikeAssetLabelString(deviceName)) {
    parsed = extractFromAssetLabel(deviceName);
  }

  // 2) Fallback a teamName SOLO si realmente parece etiqueta de activo (legacy)
  if (!parsed.codeLabel && !parsed.serial && looksLikeAssetLabelString(teamName)) {
    parsed = extractFromAssetLabel(teamName);
  }

  if (!parsed.serial && !parsed.codeLabel) return null;

  const serial = parsed.serial;
  const assetIdFromCode = serial ? null : parseAssetIdFromCodeLabel(parsed.codeLabel);

  const asset =
    serial || assetIdFromCode
      ? await prisma.asset.findFirst({
        where: serial ? { serial } : { id: assetIdFromCode ?? -1 },
        select: {
          id: true,
          serial: true,
          type: { select: { name: true } },
        },
      })
      : null;

  const typeName = asset?.type?.name ?? null;
  const typeCodeFromDb = inferTypeCodeFromTypeName(typeName);

  const typeCodeFromLabel = parsed.codeLabel ? parsed.codeLabel.split("-")[0]?.toUpperCase() : null;
  const bestTypeCode = typeCodeFromLabel || typeCodeFromDb || null;

  const codeFromDb = asset && bestTypeCode ? `${bestTypeCode}-${pad6(asset.id)}` : null;

  const assetCodeLabel = parsed.codeLabel ?? codeFromDb ?? null;
  const assetTypeCode =
    (assetCodeLabel ? assetCodeLabel.split("-")[0] : null) ?? bestTypeCode ?? null;

  return {
    assetId: asset?.id ?? null,
    assetSerial: asset?.serial ?? serial ?? null,
    assetTypeCode,
    assetCodeLabel,
  };
}

/* ================== GET: Detalle de préstamo ================== */
export const GET = withError(async (req: NextRequest, { params }: RouteParams) => {
  await requireAuth(req);

  const { id: rawId } = await params;
  const id = parseId(rawId);

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      platform: true,
      hotel: true, // ✅ Incluir hotel
    },
  });

  if (!loan) return toNoStoreJson({ error: "Préstamo no encontrado." }, 404);

  const assetHint = await resolveAssetHintFromLoanStrings(
    (loan as any).teamName ?? null,
    (loan as any).deviceName ?? null,
  );

  return toNoStoreJson({
    id: loan.id,
    collaboratorId: (loan as any).collaboratorId ?? null,
    collaboratorName: (loan as any).collaboratorName ?? null,
    collaboratorEmail: (loan as any).collaboratorEmail ?? null,
    departmentName: (loan as any).departmentName ?? null,
    address: (loan as any).address ?? null,

    teamName: (loan as any).teamName ?? null,
    deviceName: (loan as any).deviceName ?? null,

    // ✅ Agregar hotel para que se pueda heredar al crear nuevos préstamos
    hotelId: loan.hotel?.id ?? (loan as any).hotelId ?? null,
    hotelName: loan.hotel?.name ?? (loan as any).hotelName ?? null,

    platformId: loan.platform?.id ?? (loan as any).platformId ?? null,
    platformName: loan.platform?.name ?? null,

    comments: (loan as any).comments ?? null,
    startDate: loan.startDate.toISOString(),
    endDate: loan.endDate.toISOString(),

    totalAssets: 1,
    asset: assetHint,
  });
});

/* ================== PATCH: Actualizar préstamo ================== */
export const PATCH = withError(async (req: NextRequest, { params }: RouteParams) => {
  // ✅ Requiere autenticación
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  // ✅ Solo ADMIN e INGENIERO pueden actualizar préstamos
  const deny = ensureRole(auth.data, "ADMIN", "INGENIERO");
  if (deny) return deny;

  const { id: rawId } = await params;
  const id = parseId(rawId);

  // ✅ Validar hotel scope para INGENIERO
  const loanCheck = await prisma.loan.findUnique({
    where: { id },
    select: { id: true, hotelId: true },
  });
  if (!loanCheck) return toNoStoreJson({ error: "Préstamo no encontrado." }, 404);

  if (auth.data.role !== "ADMIN" && loanCheck.hotelId) {
    const hotelDeny = ensureHotelAccess(auth.data, loanCheck.hotelId, "hotel del préstamo");
    if (hotelDeny) return hotelDeny;
  }

  const body = (await req.json()) as LoanUpdatePayload;
  const data: any = {};

  if (typeof body.teamName === "string") {
    const t = body.teamName.trim();
    if (t) data.teamName = t;
  }

  // Relación platform (evita depender de platformId directo en schema)
  if (typeof body.platformId === "number" && Number.isFinite(body.platformId) && body.platformId > 0) {
    data.platform = { connect: { id: body.platformId } };
  } else if (body.platformId === null) {
    data.platform = { disconnect: true };
  }

  if (typeof body.comments === "string") {
    const c = body.comments.trim();
    data.comments = c || null;
  }

  const start = parseInputDate(body.startDate);
  if (start) data.startDate = start;

  const end = parseInputDate(body.endDate);
  if (end) data.endDate = end;

  if (Object.keys(data).length === 0) {
    return toNoStoreJson({ error: "No se enviaron cambios para actualizar." }, 400);
  }

  const updated = await prisma.loan.update({
    where: { id },
    data,
    include: { platform: true },
  });

  const assetHint = await resolveAssetHintFromLoanStrings(
    (updated as any).teamName ?? null,
    (updated as any).deviceName ?? null,
  );

  return toNoStoreJson({
    id: updated.id,
    collaboratorId: (updated as any).collaboratorId ?? null,
    collaboratorName: (updated as any).collaboratorName ?? null,
    collaboratorEmail: (updated as any).collaboratorEmail ?? null,
    departmentName: (updated as any).departmentName ?? null,
    address: (updated as any).address ?? null,

    teamName: (updated as any).teamName ?? null,
    deviceName: (updated as any).deviceName ?? null,

    platformId: updated.platform?.id ?? (updated as any).platformId ?? null,
    platformName: updated.platform?.name ?? null,

    comments: (updated as any).comments ?? null,
    startDate: updated.startDate.toISOString(),
    endDate: updated.endDate.toISOString(),

    totalAssets: 1,
    asset: assetHint,
  });
});

/* ================== DELETE: Eliminar préstamo (solo si ya está devuelto) ================== */
export const DELETE = withError(async (req: NextRequest, { params }: RouteParams) => {
  // ✅ Requiere autenticación
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  // ✅ Solo ADMIN e INGENIERO pueden eliminar préstamos
  const deny = ensureRole(auth.data, "ADMIN", "INGENIERO");
  if (deny) return deny;

  const { id: rawId } = await params;
  const id = parseId(rawId);

  const loan = await prisma.loan.findUnique({
    where: { id },
    select: { id: true, endDate: true, teamName: true, deviceName: true, hotelId: true },
  });

  if (!loan) return toNoStoreJson({ error: "Préstamo no encontrado." }, 404);

  // ✅ Validar hotel scope para INGENIERO
  if (auth.data.role !== "ADMIN" && loan.hotelId) {
    const hotelDeny = ensureHotelAccess(auth.data, loan.hotelId, "hotel del préstamo");
    if (hotelDeny) return hotelDeny;
  }

  const now = Date.now();
  const endMs = loan.endDate?.getTime?.() ?? NaN;

  if (!Number.isFinite(endMs) || endMs > now + 1000) {
    return toNoStoreJson({ error: "Solo puedes eliminar préstamos ya devueltos." }, 409);
  }

  // Preferir deviceName (etiqueta del activo). teamName es hostname/etiqueta préstamo.
  let serial: string | null = null;

  if (looksLikeAssetLabelString(loan.deviceName)) {
    serial = extractFromAssetLabel(loan.deviceName).serial;
  }

  if (!serial && looksLikeAssetLabelString(loan.teamName)) {
    serial = extractFromAssetLabel(loan.teamName).serial;
  }

  await prisma.$transaction(async (tx) => {
    if (serial) {
      await tx.asset.updateMany({
        where: { serial, status: "ASIGNADO" },
        data: { status: "ALTA" },
      });
    }
    await tx.loan.delete({ where: { id } });
  });

  return toNoStoreJson({ ok: true });
});
