// src/app/api/admin/hotels/[id]/activate/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { hotelsService } from "@/server/modules/hotels/service";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("ID inválido");
  return id;  
  
}

export const PATCH = withError(async (_req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  try {
    const hotel = await hotelsService.setActive(id, true);
    return NextResponse.json(hotel);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
    }
    throw err;
  }
});
