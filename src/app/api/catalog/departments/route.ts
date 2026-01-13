export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as svc from "@/server/modules/departments/service";
// import { requireAuth, ensureRole } from "@/server/guards/auth";

/**
 * GET /api/catalog/departments
 *   ?q=texto
 *   ?onlyActive=true
 *
 * POST /api/catalog/departments
 *   { name: string }
 */

export const GET = withError(async (req: Request) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const onlyActive = searchParams.get("onlyActive") === "true";

  const items = await svc.list({ q, onlyActive });
  return NextResponse.json({ items });
});

export const POST = withError(async (req: Request) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const body = await req.json();
  const created = await svc.create(body);
  return NextResponse.json({ department: created }, { status: 201 });
});
