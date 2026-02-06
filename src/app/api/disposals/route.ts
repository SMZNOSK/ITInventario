// src/app/api/disposals/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { DisposalDTO } from "@/server/dto/disposals";
import * as s from "@/server/modules/disposals/service";
import { requireAuth, ensureRole, ensureHotelAccess, getAllowedHotelIds } from "@/server/guards/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/disposals
 * Devuelve el historial de bajas (filtrado por hoteles del usuario si no es ADMIN).
 * Soporta query params: hotelId, q, page, pageSize
 */
export const GET = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const url = req.nextUrl;
  const hotelIdParam = url.searchParams.get("hotelId");
  const qParam = url.searchParams.get("q");
  const pageParam = url.searchParams.get("page");
  const pageSizeParam = url.searchParams.get("pageSize");

  // Obtener hoteles permitidos para el usuario
  const allowedHotels = getAllowedHotelIds(auth.data);

  // Construir filtro de hotel
  let hotelFilter: number[] | null = null;
  if (hotelIdParam) {
    const hotelId = Number(hotelIdParam);
    if (Number.isFinite(hotelId)) {
      // Si no es admin, verificar que el hotel esté en su lista
      if (allowedHotels !== null && !allowedHotels.includes(hotelId)) {
        return NextResponse.json({ error: "No tienes acceso a ese hotel" }, { status: 403 });
      }
      hotelFilter = [hotelId];
    }
  } else if (allowedHotels !== null) {
    // No-admin sin filtro específico: usar sus hoteles
    hotelFilter = allowedHotels;
  }

  // Llamar al servicio con filtros
  const items = await s.listFiltered({
    hotelIds: hotelFilter,
    q: qParam || undefined,
    page: pageParam ? Number(pageParam) : undefined,
    pageSize: pageSizeParam ? Number(pageSizeParam) : undefined,
  });

  return NextResponse.json({ items });
});

/**
 * POST /api/disposals
 * Crea una baja a partir de un assetId (ID numérico o serial).
 * Solo usuarios con acceso al hotel del asset pueden dar de baja.
 * Soporta evidenceUrls[] para múltiples evidencias.
 */
export const POST = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  // Permitir ADMIN, ALMACEN, INGENIERO crear bajas
  const deny = ensureRole(auth.data, "ADMIN", "ALMACEN", "INGENIERO");
  if (deny) return deny;

  const body = await req.json();

  // Obtener el asset para verificar el hotel
  const assetIdRaw = body.assetId;
  let asset;

  // Resolver asset por ID o serial
  const maybeNumber = Number(String(assetIdRaw).trim());
  if (Number.isFinite(maybeNumber)) {
    asset = await prisma.asset.findUnique({
      where: { id: maybeNumber },
      select: { id: true, currentHotelId: true, status: true },
    });
  }
  if (!asset) {
    asset = await prisma.asset.findUnique({
      where: { serial: String(assetIdRaw).trim() },
      select: { id: true, currentHotelId: true, status: true },
    });
  }

  if (!asset) {
    return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
  }

  // Verificar que no esté ya en BAJA
  if (asset.status === "BAJA") {
    return NextResponse.json({ error: "El equipo ya está dado de baja" }, { status: 409 });
  }

  // Verificar acceso al hotel del asset
  if (asset.currentHotelId) {
    const hotelDeny = ensureHotelAccess(auth.data, asset.currentHotelId, "hotel del equipo");
    if (hotelDeny) return hotelDeny;
  }

  const data = DisposalDTO.parse(body);
  const out = await s.create({
    ...data,
    createdById: auth.data.id,
  });
  return NextResponse.json({ disposal: out }, { status: 201 });
});
