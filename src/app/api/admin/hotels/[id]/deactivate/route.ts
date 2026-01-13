// src/app/api/admin/hotels/[id]/deactivate/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { hotelsService } from "@/server/modules/hotels/service";
import { requireAuth, ensureRole } from "@/server/guards/auth";

type RouteParams = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("ID inválido");
  return id;
}

export const PATCH = withError(async (req: NextRequest, { params }: RouteParams) => {
  // ✅ Requiere autenticación y rol ADMIN
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

  const { id: rawId } = await params;
  const id = parseId(rawId);

  try {
    const hotel = await hotelsService.setActive(id, false);
    return NextResponse.json(hotel);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
    }
    throw err;
  }
});
