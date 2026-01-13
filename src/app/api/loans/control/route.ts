
// src/app/api/loans/control/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/server/guards/auth";

function safeText(v: any): string {
  return String(v ?? "").trim();
}

function dayRange(yyyyMmDd: string) {
  const d0 = new Date(`${yyyyMmDd}T00:00:00`);
  const d1 = new Date(d0);
  d1.setDate(d1.getDate() + 1);
  return { gte: d0, lt: d1 };
}

function toNoStoreJson(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
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

/**
 * Loan.teamName suele venir así:
 *  - "LAP-000001 · S/N: POIUHGVB11"
 *  - "LAP-000001 · POIUHGVB11"
 *  - o (mal guardado) "PRESTAMO001" y el string correcto quedó en deviceName
 */
function extractFromTeamName(raw: any): { codeLabel: string | null; serial: string | null } {
  const s = safeText(raw);
  if (!s) return { codeLabel: null, serial: null };

  const codeMatch = s.match(/\b([A-Za-z]{3}-\d{6})\b/);
  const codeLabel = codeMatch ? codeMatch[1].toUpperCase() : null;

  const snMatch = s.match(/(?:S\/N|SN|SERIAL|SERIE)\s*[:#]?\s*([A-Za-z0-9-]+)/i);
  let serial = snMatch ? snMatch[1]?.trim() : null;

  // fallback por tokens (tomar el candidato más largo que NO sea el codeLabel)
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

// GET /api/loans/control
export const GET = withError(async (req: NextRequest) => {
  // ✅ Requiere autenticación
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const sp = req.nextUrl.searchParams;

  const hotel = safeText(sp.get("hotel"));
  const department = safeText(sp.get("department"));
  const name = safeText(sp.get("name"));
  const team = safeText(sp.get("team"));
  const date = safeText(sp.get("date"));

  const and: Prisma.LoanWhereInput[] = [];

  // ✅ Filtro por hoteles del usuario (ADMIN ve todos, otros solo sus hoteles)
  if (auth.data.role !== "ADMIN") {
    and.push({ hotelId: { in: auth.data.hotels } });
  }

  if (department) {
    and.push({ departmentName: { contains: department, mode: "insensitive" } });
  }

  if (name) {
    and.push({ collaboratorName: { contains: name, mode: "insensitive" } });
  }

  // Filtro por el nombre del equipo guardado en el préstamo
  if (team) {
    and.push({ teamName: { contains: team, mode: "insensitive" } });
  }

  if (date) {
    const r = dayRange(date);
    and.push({ startDate: { gte: r.gte, lt: r.lt } });
  }

  if (hotel) {
    and.push({
      OR: [
        { hotelName: { contains: hotel, mode: "insensitive" } },
        { hotel: { name: { contains: hotel, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.LoanWhereInput = and.length ? { AND: and } : {};

  const loans = await prisma.loan.findMany({
    where,
    include: {
      hotel: { select: { id: true, name: true } },
      platform: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "desc" },
  });

  // 1) Parsear serials para lookup masivo (sin N+1)
  const parsedByLoanId = new Map<number, { codeLabel: string | null; serial: string | null }>();

  const serials: string[] = [];
  for (const loan of loans) {
    // ✅ PRIMARIO: deviceName (contiene "LAP-000022 · S/N: POIUHGVB10")
    let parsed = extractFromTeamName(loan.deviceName);

    // Fallback: si deviceName no tiene datos útiles, intentar con teamName
    if (!parsed.codeLabel && !parsed.serial && loan.teamName) {
      const alt = extractFromTeamName(loan.teamName);
      if (alt.codeLabel || alt.serial) parsed = alt;
    }

    parsedByLoanId.set(loan.id, parsed);
    if (parsed.serial) serials.push(parsed.serial);
  }

  const uniqueSerials = Array.from(new Set(serials));
  const assets = uniqueSerials.length
    ? await prisma.asset.findMany({
      where: { serial: { in: uniqueSerials } },
      select: {
        id: true,
        serial: true,
        status: true, // ✅ Incluir status para saber si está devuelto
        type: { select: { name: true } }
      },
    })
    : [];

  const assetBySerial = new Map<
    string,
    {
      id: number;
      serial: string;
      typeName: string | null;
      typeCode: string | null;
      codeFromDb: string | null;
      status: string | null; // ✅ Estado del activo
    }
  >();

  for (const a of assets) {
    const typeName = a.type?.name ?? null;
    const typeCode = inferTypeCodeFromTypeName(typeName);
    const codeFromDb = typeCode ? `${typeCode}-${pad6(a.id)}` : null;

    assetBySerial.set(a.serial, {
      id: a.id,
      serial: a.serial,
      typeName,
      typeCode,
      codeFromDb,
      status: a.status ?? null, // ✅ Guardar status
    });
  }

  const items = loans.map((loan) => {
    const parsed = parsedByLoanId.get(loan.id) ?? { codeLabel: null, serial: null };

    const asset = parsed.serial ? assetBySerial.get(parsed.serial) : undefined;

    const assetSerial = parsed.serial ?? asset?.serial ?? null;

    // ✅ CORRECCIÓN: Usar el nombre del tipo real del Asset (ej. "LAP-000001")
    // en lugar de calcularlo como typeCode+assetId (que da LAP-000022)
    // El typeName del Asset ya contiene el código correcto como "LAP-000001"
    const assetCodeLabel = asset?.typeName ?? parsed.codeLabel ?? asset?.codeFromDb ?? null;

    const assetTypeCode =
      (assetCodeLabel ? assetCodeLabel.split("-")[0] : null) ?? asset?.typeCode ?? null;

    // ✅ Determinar si el préstamo está devuelto basándose en el status del activo
    // ASIGNADO = préstamo activo, ALTA = devuelto
    const assetStatus = asset?.status ?? null;
    const isReturned = assetStatus === "ALTA";

    return {
      id: loan.id,
      collaboratorId: loan.collaboratorId, // ✅ Agregado para agrupar por colaborador
      hotelName: loan.hotel?.name ?? loan.hotelName ?? null,
      departmentName: loan.departmentName ?? null,
      collaboratorName: loan.collaboratorName ?? null,

      // Originales (por compatibilidad)
      teamName: loan.teamName ?? null,
      deviceName: loan.deviceName ?? null,

      platformId: loan.platformId ?? null,
      platformName: loan.platform?.name ?? null,

      startDate: loan.startDate.toISOString(),
      endDate: loan.endDate.toISOString(),
      totalAssets: 1,

      // ✅ CAMPOS CORRECTOS PARA TABLA:
      assetSerial,
      assetCodeLabel,
      assetTypeCode,
      assetId: asset?.id ?? null,
      assetStatus, // ✅ Estado del activo
      isReturned, // ✅ Indica si el préstamo fue devuelto
    };
  });

  return toNoStoreJson({ items });
});
