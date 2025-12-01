// src/app/api/disposals/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { DisposalDTO } from "@/server/dto/disposals";
import * as s from "@/server/modules/disposals/service";
// import { requireAuth, ensureRole } from "@/server/guards/auth";

/**
 * GET /api/disposals
 * Devuelve el historial de bajas.
 */
export const GET = withError(async () => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const items = await s.list();
  return NextResponse.json({ items });
});

/**
 * POST /api/disposals
 * Crea una baja a partir de un assetId (ID numérico o serial).
 */
export const POST = withError(async (req) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const body = await req.json();
  const data = DisposalDTO.parse(body);

  const out = await s.create(data);
  return NextResponse.json({ disposal: out }, { status: 201 });
});
