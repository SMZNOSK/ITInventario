// src/app/api/assets/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as s from "@/server/modules/assets/service";
import { CreateAssetDTO, InventoryAssetDTO } from "@/server/dto/assets";
// Opcional si quieres auth/roles:
// import { requireAuth, ensureRole } from "@/server/guards/auth";

/**
 * GET /api/assets
 *
 * Soporta (opcionalmente) filtros por querystring:
 *   - ?q=...                  → búsqueda por texto (serial, modelo, etc.)
 *   - ?status=ALTA            → estado del equipo (ALTA, ASIGNADO, TRANSFERENCIA_PENDIENTE, BAJA)
 *   - ?hotelId=1              → filtrar por hotel actual
 *   - ?page=1&pageSize=20     → paginación básica
 *
 * El service puede devolver:
 *   - un array simple  → respondemos { items }
 *   - un objeto { items, total, ... } → lo devolvemos tal cual
 */
export const GET = withError(async (req: Request) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q") || undefined;

  // Normalizamos el status para que solo pasen valores válidos
  const rawStatus = searchParams.get("status") || undefined;
  const validStatuses = new Set([
    "ALTA",
    "ASIGNADO",
    "TRANSFERENCIA_PENDIENTE",
    "BAJA",
  ]);
  const status =
    rawStatus && validStatuses.has(rawStatus) ? rawStatus : undefined;

  const hotelIdRaw = searchParams.get("hotelId");
  const pageRaw = searchParams.get("page");
  const pageSizeRaw = searchParams.get("pageSize");

  const page = pageRaw ? Math.max(1, Number(pageRaw) || 1) : 1;
  const pageSize = pageSizeRaw
    ? Math.min(100, Math.max(1, Number(pageSizeRaw) || 20))
    : 20;

  const filters = {
    q,
    status,
    hotelId: hotelIdRaw ? Number(hotelIdRaw) : undefined,
    page,
    pageSize,
  };

  // Usamos `any` para no pelear con la firma actual de s.list()
  const result = await (s as any).list(filters);

  // Si el service devuelve un array simple, normalizamos a { items }
  if (Array.isArray(result)) {
    return NextResponse.json({ items: result });
  }

  // Si ya devuelve { items, total, ... } lo exponemos tal cual
  return NextResponse.json(result);
});

/**
 * POST /api/assets
 *
 * Crea un nuevo activo. Soporta dos flujos:
 *
 *  - Inventario nuevo (pantalla de Captura): InventoryAssetDTO
 *  - Flujo legacy (importaciones, etc.): CreateAssetDTO original
 */
export const POST = withError(async (req: Request) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

  const json = await req.json();

  // 1) Intentamos primero el DTO de inventario (nuevo flujo)
  const invParsed = InventoryAssetDTO.safeParse(json);
  if (invParsed.success) {
    const asset = await s.createFromInventory(invParsed.data);
    return NextResponse.json({ asset }, { status: 201 });
  }

  // 2) Si no coincide, usamos el DTO legacy de siempre
  const data = CreateAssetDTO.parse(json);
  const asset = await s.create(data);

  return NextResponse.json({ asset }, { status: 201 });
});
