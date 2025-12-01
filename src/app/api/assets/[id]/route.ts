// src/app/api/assets/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import * as s from "@/server/modules/assets/service";
import { UpdateAssetDTO } from "@/server/dto/assets";
// import { requireAuth, ensureRole } from "@/server/guards/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw http.badRequest("id inválido");
  }
  return id;
}

/**
 * GET /api/assets/:id
 */
export const GET = withError(
  async (_req: Request, context: RouteContext) => {
    const { id } = await context.params;
    const assetId = parseId(id);

    const asset = await s.get(assetId);
    if (!asset) throw http.notFound("Not found");
    return NextResponse.json({ asset });
  }
);

/**
 * PATCH /api/assets/:id
 * Usa UpdateAssetDTO (parcial) para validar el body
 */
export const PATCH = withError(
  async (req: Request, context: RouteContext) => {
    // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
    // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

    const { id } = await context.params;
    const assetId = parseId(id);

    const body = await req.json();
    const data = UpdateAssetDTO.parse(body);

    const asset = await s.update(assetId, data);
    return NextResponse.json({ asset });
  }
);

/**
 * DELETE /api/assets/:id
 * Elimina el equipo (si no tiene asignaciones/bajas).
 */
export const DELETE = withError(
  async (_req: Request, context: RouteContext) => {
    // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
    // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

    const { id } = await context.params;
    const assetId = parseId(id);

    await s.remove(assetId);
    return NextResponse.json({ ok: true });
  }
);
