// src/app/api/admin/hotels/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { hotelsService } from "@/server/modules/hotels/service";
import { UpdateHotelDTO } from "@/server/dto/hotels";
import { requireAuth, ensureRole } from "@/server/guards/auth";

type RouteParams = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("ID inválido");
  return id;
}

// ✅ GET: Obtener hotel (solo ADMIN)
export const GET = withError(async (req: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  const hotel = await hotelsService.getById(id);
  if (!hotel) throw http.notFound("Hotel no encontrado");
  return NextResponse.json(hotel);
});

// ✅ PUT: Actualizar hotel (solo ADMIN)
export const PUT = withError(async (req: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  const body = await req.json();
  const data = UpdateHotelDTO.parse(body);

  try {
    const hotel = await hotelsService.update(id, data);
    return NextResponse.json(hotel);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
    }
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un hotel con ese nombre" },
        { status: 409 }
      );
    }
    throw err;
  }
});

// ✅ DELETE: Eliminar hotel (solo ADMIN)
export const DELETE = withError(async (req: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  try {
    await hotelsService.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
    }
    throw err;
  }
});
