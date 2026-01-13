// src/app/api/loans/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { requireAuth, ensureRole, ensureHotelAccess } from "@/server/guards/auth";

/* ----------------------------- helpers ----------------------------- */
function safeText(v: any): string {
  return String(v ?? "").trim();
}

function toIdOrNull(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDateInput(v: any): Date | null {
  const s = safeText(v);
  if (!s) return null;

  // "YYYY-MM-DD" (input type="date")
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // ISO u otros formatos
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inferTypeCodeFromTypeName(typeName: string | null | undefined): string | null {
  const s = String(typeName ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleaned) return null;
  // Nota: se usa solo para formar un codeLabel legible (CPU/LAP/DIA...)
  return cleaned.slice(0, 3);
}

function pad6(n: number): string {
  return String(Math.trunc(n)).padStart(6, "0");
}

function pickBodyAssetId(body: any): number | null {
  return (
    toIdOrNull(body?.assetId) ??
    toIdOrNull(body?.selectedAssetId) ??
    toIdOrNull(body?.equipmentId) ??
    toIdOrNull(body?.asset?.id) ??
    null
  );
}

function pickBodyAssetSerial(body: any): string | null {
  const candidates = [
    body?.assetSerial,
    body?.serial,
    body?.asset?.serial,
    body?.asset?.assetSerial,
    body?.assetHint?.assetSerial,
  ];
  for (const c of candidates) {
    const s = safeText(c);
    if (s) return s;
  }
  return null;
}

function pickBodyAssetCodeLabel(body: any): string | null {
  const candidates = [
    body?.assetCodeLabel,
    body?.codeLabel,
    body?.asset?.codeLabel,
    body?.asset?.assetCodeLabel,
    body?.assetHint?.assetCodeLabel,
    body?.assetLabel, // a veces UI manda el label aquí
  ];
  for (const c of candidates) {
    const s = safeText(c);
    if (s) return s;
  }
  return null;
}

/**
 * Construye un snapshot consistente para que el DETALLE del préstamo pueda mostrar:
 * - TIPO (derivado de codeLabel o type)
 * - SERIAL real (desde Asset.serial)
 *
 * Estrategia:
 * - Si viene assetId: resolvemos en BD (serial + type)
 * - Si viene serial: resolvemos en BD
 * - Si viene codeLabel: lo incluimos (sin inventar serial)
 *
 * Resultado final en deviceName:
 *   "<CODELABEL> · S/N: <SERIAL>"
 * o "S/N: <SERIAL>" si no hay codeLabel.
 */
async function buildDeviceNameFromAssetSelection(body: any): Promise<string | null> {
  const assetId = pickBodyAssetId(body);
  const serialFromBody = pickBodyAssetSerial(body);
  const codeLabelFromBody = pickBodyAssetCodeLabel(body);

  let asset:
    | {
      id: number;
      serial: string;
      type: { name: string | null } | null;
    }
    | null = null;

  if (assetId) {
    asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true, serial: true, type: { select: { name: true } } },
    });
  } else if (serialFromBody) {
    asset = await prisma.asset.findFirst({
      where: { serial: serialFromBody },
      select: { id: true, serial: true, type: { select: { name: true } } },
    });
  }

  const serial = asset?.serial ?? (serialFromBody || null);
  const typeCode = inferTypeCodeFromTypeName(asset?.type?.name ?? null);

  // codeLabel:
  // - preferimos el que venga de UI
  // - si no, intentamos calcularlo (typeCode + id) si tenemos asset real
  const computedCodeLabel =
    asset && typeCode ? `${typeCode}-${pad6(asset.id)}` : null;

  const codeLabel = codeLabelFromBody || computedCodeLabel || null;

  // Serial: si no tenemos serial, NO inventamos string (evita PRESTAM001 como serial)
  if (!serial && !codeLabel) return null;

  if (serial && codeLabel) return `${codeLabel} · S/N: ${serial}`;
  if (serial) return `S/N: ${serial}`;
  return codeLabel; // solo etiqueta, sin serial
}

/* ------------------------------ GET ------------------------------- */
// GET /api/loans
export const GET = withError(async (req: NextRequest) => {
  // ✅ Requiere autenticación
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  // ✅ ADMIN: sin filtro de hotel, otros roles: solo sus hoteles
  const hotelFilter = auth.data.role === "ADMIN"
    ? {}
    : { hotelId: { in: auth.data.hotels } };

  const loans = await prisma.loan.findMany({
    where: hotelFilter,
    orderBy: { startDate: "desc" },
    include: {
      hotel: { select: { id: true, name: true } },
      platform: { select: { id: true, name: true } },
    },
  });

  const items = loans.map((loan) => ({
    id: loan.id,

    collaboratorId: loan.collaboratorId,
    collaboratorName: loan.collaboratorName,
    collaboratorEmail: loan.collaboratorEmail ?? null,
    departmentName: loan.departmentName ?? null,
    address: loan.address ?? null,

    // hotel
    hotelId: (loan as any).hotelId ?? null,
    hotelName: loan.hotel?.name ?? (loan as any).hotelName ?? null,

    /**
     * IMPORTANTE (alineado a tu UI y a Control):
     * - "teamName" = Hostname (Nombre del equipo)
     * - "deviceName" = snapshot del equipo prestado (ideal: "<CODELABEL> · S/N: <SERIAL>")
     */
    teamName: (loan as any).teamName ?? null,
    deviceName: (loan as any).deviceName ?? null,

    // platform
    platformId: loan.platform?.id ?? null,
    platformName: loan.platform?.name ?? null,

    comments: (loan as any).comments ?? null,

    startDate: loan.startDate.toISOString(),
    endDate: loan.endDate.toISOString(),
  }));

  return NextResponse.json({ items });
});

/* ------------------------------ POST ------------------------------ */
// POST /api/loans
export const POST = withError(async (req: NextRequest) => {
  // ✅ Requiere autenticación
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  // ✅ Solo ADMIN e INGENIERO pueden crear préstamos
  const deny = ensureRole(auth.data, "ADMIN", "INGENIERO");
  if (deny) return deny;

  const body = await req.json().catch(() => null);

  const collaboratorId = safeText(body?.collaboratorId);
  const collaboratorName = safeText(body?.collaboratorName);
  const collaboratorEmail = safeText(body?.collaboratorEmail) || null;
  const departmentName = safeText(body?.departmentName) || null;
  const address = safeText(body?.address) || null;

  // ✅ Validar hotel scope para INGENIERO
  const hotelIdFromBody = toIdOrNull(body?.hotelId);
  if (auth.data.role !== "ADMIN" && hotelIdFromBody) {
    const hotelDeny = ensureHotelAccess(auth.data, hotelIdFromBody, "hotelId");
    if (hotelDeny) return hotelDeny;
  }

  // UI: "Nombre del equipo (Hostname)" -> teamName
  const teamName = safeText(body?.teamName ?? body?.hostname ?? body?.computerName);

  // 🚀 NUEVO: construir snapshot consistente del activo seleccionado (serial + codeLabel)
  // Esto permite que en /equipo/loans/[id] se muestre:
  // - TIPO correcto
  // - SERIAL real (NO PRESTAM001)
  const deviceNameFromAsset = await buildDeviceNameFromAssetSelection(body);

  // Fallback: si UI mandó una etiqueta manual
  const deviceNameFallback = safeText(body?.deviceName ?? body?.equipmentName ?? body?.assetLabel) || null;

  const deviceName = deviceNameFromAsset || deviceNameFallback;

  const hotelId = toIdOrNull(body?.hotelId);
  const hotelNameFromBody = safeText(body?.hotelName) || null;

  const platformId = toIdOrNull(body?.platformId);

  const comments = safeText(body?.comments) || null;

  const start = parseDateInput(body?.startDate);
  const end = parseDateInput(body?.endDate);

  // Validaciones claras
  if (!collaboratorId) {
    return NextResponse.json({ error: "Debes indicar el número de colaborador." }, { status: 400 });
  }
  if (!collaboratorName) {
    return NextResponse.json({ error: "Debes indicar el nombre del colaborador." }, { status: 400 });
  }
  if (!teamName) {
    return NextResponse.json(
      { error: "Debes indicar el nombre del equipo (Hostname) para que se vea en Control." },
      { status: 400 },
    );
  }
  if (!start || !end) {
    return NextResponse.json(
      { error: "Fechas inválidas. Usa formato YYYY-MM-DD en Fecha de Inicio y Fecha de Devolución." },
      { status: 400 },
    );
  }
  if (end.getTime() < start.getTime()) {
    return NextResponse.json(
      { error: "La fecha de devolución no puede ser menor a la fecha de inicio." },
      { status: 400 },
    );
  }

  // hotel connect + snapshot name
  let hotelConnect: { connect: { id: number } } | undefined;
  let snapshotHotelName: string | null = hotelNameFromBody;

  if (hotelId) {
    hotelConnect = { connect: { id: hotelId } };
    if (!snapshotHotelName) {
      const h = await prisma.hotel.findUnique({ where: { id: hotelId }, select: { name: true } });
      snapshotHotelName = h?.name ?? null;
    }
  }

  // platform connect
  let platformConnect: { connect: { id: number } } | undefined;
  if (platformId) {
    platformConnect = { connect: { id: platformId } };
  }

  // 🔧 Resolver el assetId para poder actualizar su estado
  const assetIdToUpdate = pickBodyAssetId(body);

  // Create préstamo + actualizar estado del activo en una transacción
  const loan = await prisma.$transaction(async (tx) => {
    // 1. Crear el préstamo
    const created = await tx.loan.create({
      data: {
        collaboratorId,
        collaboratorName,
        collaboratorEmail,
        departmentName,
        address,

        // Hostname
        teamName,

        // Snapshot hotelName + relación
        hotelName: snapshotHotelName,
        ...(hotelConnect ? { hotel: hotelConnect } : {}),

        // Plataforma por relación
        ...(platformConnect ? { platform: platformConnect } : {}),

        // Snapshot del equipo prestado (serial + codeLabel si se pudo resolver)
        ...(deviceName ? { deviceName } : {}),

        comments,

        startDate: start,
        endDate: end,
      } as any,
    });

    // 2. Actualizar el estado del activo a "ASIGNADO" si se pudo identificar
    if (assetIdToUpdate) {
      await tx.asset.update({
        where: { id: assetIdToUpdate },
        data: { status: "ASIGNADO" },
      });
    }

    return created;
  });

  return NextResponse.json({ id: loan.id });
});
